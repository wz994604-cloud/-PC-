// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSource } from "@/app/api/source/route";
import { GET as getPrediction } from "@/app/api/prediction/route";
import { GET as getPredictionHistory } from "@/app/api/prediction/history/route";
import { closeDatabaseForTests } from "@/lib/db/sqlite";

const upstream=(issue:string,numbers:[number,number,number])=>new Response(JSON.stringify({
  success:true,
  data:{issue,num1:numbers[0],num2:numbers[1],num3:numbers[2],openTime:null,nextOpenTime:null,history:[]},
}),{status:200,headers:{"content-type":"application/json"}});

beforeEach(()=>{process.env.DATABASE_PATH=":memory:";closeDatabaseForTests()});
afterEach(()=>{vi.unstubAllGlobals();closeDatabaseForTests();delete process.env.DATABASE_PATH});

describe("prediction API accumulation",()=>{
  it("uses source polling to save, reconcile and expose backend evaluation without changing the page",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(upstream("100",[4,5,5]))
      .mockResolvedValueOnce(upstream("101",[4,5,5]))
      .mockResolvedValueOnce(upstream("101",[4,5,5]));
    vi.stubGlobal("fetch",fetchMock);

    expect((await getSource()).status).toBe(200);
    expect((await getSource()).status).toBe(200);

    const response=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    const body=await response.json();
    expect(response.status).toBe(200);
    expect(body.data.records.map((record:{issue:string})=>record.issue)).toEqual(["102","101"]);
    expect(body.data.records.find((record:{issue:string})=>record.issue==="101")).toMatchObject({actualSum:14,checkedAt:expect.any(String)});
    expect(body.data.evaluation).toMatchObject({
      sampleSize:1,
      exactHitRate:expect.any(Number),
      top3HitRate:expect.any(Number),
      top5HitRate:expect.any(Number),
      meanAbsoluteError:expect.any(Number),
      confidencePerformance:expect.any(Array),
    });
  });

  it("syncs on prediction access and keeps repeated requests idempotent",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockImplementation(()=>Promise.resolve(upstream("200",[4,5,5]))));
    expect((await getPrediction()).status).toBe(200);
    expect((await getPrediction()).status).toBe(200);

    const response=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    const body=await response.json();
    expect(body.data.total).toBe(1);
    expect(body.data.records[0].issue).toBe("201");
  });

  it("syncs on history access without overwriting a solidified issue",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockImplementation(()=>Promise.resolve(upstream("300",[4,5,5]))));
    const first=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    const firstBody=await first.json();
    const original=firstBody.data.records[0];
    const second=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    const secondBody=await second.json();
    expect(secondBody.data.total).toBe(1);
    expect(secondBody.data.records[0]).toEqual(original);
  });
});

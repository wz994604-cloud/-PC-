// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/internal/prediction-cycle/route";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { getPredictionHistory } from "@/lib/db/prediction-repository";

beforeEach(()=>{process.env.DATABASE_PATH=":memory:";closeDatabaseForTests()});
afterEach(()=>{vi.unstubAllGlobals();closeDatabaseForTests();delete process.env.DATABASE_PATH;delete process.env.CRON_SECRET});

describe("prediction cron route",()=>{
  it("rejects calls when CRON_SECRET is missing",async()=>{
    const response=await GET(new NextRequest("http://localhost/api/internal/prediction-cycle"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({success:false,error:{code:"UNAUTHORIZED"}});
  });

  it("rejects an invalid bearer token",async()=>{
    process.env.CRON_SECRET="expected";
    const response=await GET(new NextRequest("http://localhost/api/internal/prediction-cycle",{headers:{authorization:"Bearer wrong"}}));
    expect(response.status).toBe(401);
  });

  it("syncs draws and solidifies the next prediction when authorized",async()=>{
    process.env.CRON_SECRET="expected";
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success:true,
      data:{issue:"100",num1:4,num2:5,num3:5,openTime:"2026-01-01T00:00:00Z",nextOpenTime:"2026-01-01T00:03:30Z",history:[]},
    }),{status:200,headers:{"content-type":"application/json"}})));
    const response=await GET(new NextRequest("http://localhost/api/internal/prediction-cycle",{headers:{authorization:"Bearer expected"}}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({success:true,data:{predictionIssue:"101",predictionInserted:true}});
    expect((await getPredictionHistory()).records.map((record)=>record.issue)).toEqual(["101"]);
  });
});

// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPrediction } from "@/app/api/prediction/route";
import { GET as getPredictionHistory } from "@/app/api/prediction/history/route";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { savePredictionOnce } from "@/lib/db/prediction-repository";
import { createPrediction } from "@/lib/prediction/model";
import type { Draw } from "@/lib/draw/types";

const draw:Draw={issue:"100",numbers:[4,5,5],sum:14,bigSmall:"大",oddEven:"双",
  pattern:"杂六",openTime:null,rawOpenTime:null};

beforeEach(()=>{process.env.DATABASE_PATH=":memory:";closeDatabaseForTests()});
afterEach(()=>{vi.unstubAllGlobals();closeDatabaseForTests();delete process.env.DATABASE_PATH});

describe("public prediction APIs are read-only",()=>{
  it("returns an accumulating response when no prediction is stored",async()=>{
    const response=await getPrediction(),body=await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({success:true,data:null,meta:{isAccumulating:true}});
  });

  it("reads the latest immutable prediction without calling upstream",async()=>{
    const prediction=createPrediction([draw])!;
    await savePredictionOnce(prediction,"2026-01-01T00:00:00Z");
    const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
    const response=await getPrediction(),body=await response.json();
    expect(body.data).toMatchObject({issue:"101",modelVersion:"v0.1 Beta"});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads paginated history without generating or overwriting records",async()=>{
    const prediction=createPrediction([draw])!;
    await savePredictionOnce(prediction,"2026-01-01T00:00:00Z");
    const first=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    const second=await getPredictionHistory(new NextRequest("http://localhost/api/prediction/history?limit=10&page=1"));
    expect((await first.json()).data).toMatchObject({total:1,records:[{issue:"101"}]});
    expect((await second.json()).data.total).toBe(1);
  });
});

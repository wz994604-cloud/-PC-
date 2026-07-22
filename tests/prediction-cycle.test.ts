// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { saveDraws } from "@/lib/db/draw-repository";
import { getPredictionHistory } from "@/lib/db/prediction-repository";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { runPredictionCycle } from "@/lib/prediction/cycle";
import type { Draw } from "@/lib/draw/types";

const draw=(issue:string,sum:number):Draw=>({issue,numbers:[Math.min(9,sum),Math.min(9,Math.max(0,sum-9)),Math.max(0,sum-18)],sum,bigSmall:sum>=14?"大":"小",oddEven:sum%2?"单":"双",pattern:"杂六",openTime:null,rawOpenTime:null});

beforeEach(()=>{process.env.DATABASE_PATH=":memory:";closeDatabaseForTests()});
afterEach(()=>{vi.restoreAllMocks();closeDatabaseForTests();delete process.env.DATABASE_PATH});

describe("automatic prediction cycle",()=>{
  it("solidifies every next issue, reconciles the draw and remains idempotent",()=>{
    const info=vi.spyOn(console,"info").mockImplementation(()=>undefined);
    saveDraws([draw("10",14)]);

    const first=runPredictionCycle("2026-01-01T00:00:00Z");
    const duplicate=runPredictionCycle("2026-01-01T00:01:00Z");
    expect(first.prediction?.issue).toBe("11");
    expect(first.predictionInserted).toBe(true);
    expect(duplicate.predictionInserted).toBe(false);
    expect(getPredictionHistory().total).toBe(1);

    saveDraws([draw("11",first.prediction!.recommendedSum)]);
    const next=runPredictionCycle("2026-01-01T00:03:30Z");
    expect(next.reconciledCount).toBe(1);
    expect(next.prediction?.issue).toBe("12");
    expect(next.predictionInserted).toBe(true);

    const records=getPredictionHistory().records;
    expect(records).toHaveLength(2);
    expect(records.find((record)=>record.issue==="11")).toMatchObject({
      actualSum:first.prediction!.recommendedSum,
      hit:true,
      checkedAt:"2026-01-01T00:03:30Z",
    });
    expect(records.find((record)=>record.issue==="12")).toMatchObject({actualSum:null,hit:null,checkedAt:null});

    const events=info.mock.calls.map(([entry])=>JSON.parse(String(entry)).event);
    expect(events).toContain("prediction.generated");
    expect(events).toContain("prediction.saved");
    expect(events).toContain("prediction.save_skipped");
    expect(events).toContain("prediction.reconciled");
  });
});

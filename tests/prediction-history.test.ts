// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it } from "vitest";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { saveDraws } from "@/lib/db/draw-repository";
import { getPredictionHistory,reconcilePredictions,savePredictionOnce } from "@/lib/db/prediction-repository";
import { createPrediction } from "@/lib/prediction/model";
import type { Draw } from "@/lib/draw/types";
const draw=(issue:string,sum:number):Draw=>({issue,numbers:[Math.min(9,sum),Math.min(9,Math.max(0,sum-9)),Math.max(0,sum-18)],sum,bigSmall:sum>=14?"大":"小",oddEven:sum%2?"单":"双",pattern:"杂六",openTime:null,rawOpenTime:null});
beforeEach(()=>{process.env.DATABASE_PATH=":memory:";closeDatabaseForTests()});afterEach(()=>{closeDatabaseForTests();delete process.env.DATABASE_PATH});
describe("prediction history",()=>{
 it("solidifies one immutable prediction per issue",async()=>{const original=createPrediction([draw("10",14)])!;await savePredictionOnce(original,"2026-01-01T00:00:00Z");await savePredictionOnce({...original,recommendedSum:1},"2026-01-02T00:00:00Z");const saved=(await getPredictionHistory(10,0)).records[0];expect(saved.recommendedSum).toBe(original.recommendedSum);expect(saved.predictedAt).toBe("2026-01-01T00:00:00Z");expect((await getPredictionHistory(10,0)).total).toBe(1)});
 it("adds actual result without replacing prediction",async()=>{const prediction=createPrediction([draw("10",14)])!;await savePredictionOnce(prediction);await saveDraws([draw(prediction.issue,prediction.recommendedSum)]);expect(await reconcilePredictions("2026-01-03T00:00:00Z")).toHaveLength(1);const saved=(await getPredictionHistory(10,0)).records[0];expect(saved.actualSum).toBe(prediction.recommendedSum);expect(saved.hit).toBe(true);expect(saved.checkedAt).toBe("2026-01-03T00:00:00Z");expect(await reconcilePredictions()).toHaveLength(0)});
 it("does not manufacture old predictions",async()=>expect(await getPredictionHistory(10,0)).toEqual({records:[],total:0}));
});

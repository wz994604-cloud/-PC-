// @vitest-environment node
import { describe,expect,it } from "vitest";
import { evaluatePredictions } from "@/lib/prediction/evaluation";
import { createPrediction } from "@/lib/prediction/model";
import type { PredictionHistoryRecord } from "@/lib/db/prediction-repository";
import type { Draw } from "@/lib/draw/types";

const draw=(issue:string,sum:number):Draw=>({issue,numbers:[Math.min(9,sum),Math.min(9,Math.max(0,sum-9)),Math.max(0,sum-18)],sum,bigSmall:sum>=14?"大":"小",oddEven:sum%2?"单":"双",pattern:"杂六",openTime:null,rawOpenTime:null});
const record=(issue:string,actualSum:number|null,confidenceLabel:PredictionHistoryRecord["confidenceLabel"]):PredictionHistoryRecord=>{
  const prediction=createPrediction([draw(String(Number(issue)-1),14),draw(String(Number(issue)-2),12),draw(String(Number(issue)-3),14)])!;
  return {...prediction,issue,confidenceLabel,predictedAt:"2026-01-01T00:00:00Z",actualSum,hit:actualSum===null?null:actualSum===prediction.recommendedSum,checkedAt:actualSum===null?null:"2026-01-01T00:04:00Z"};
};

describe("prediction evaluation",()=>{
  it("calculates exact, top 3, top 5, MAE and confidence performance from checked snapshots only",()=>{
    const exact=record("20",14,"较高");
    exact.actualSum=exact.recommendedSum;
    exact.hit=true;
    const ranked=[...exact.distribution].sort((a,b)=>b.probability-a.probability||a.sum-b.sum);
    const top3=record("21",ranked[2].sum,"中等");
    const miss=record("22",ranked.at(-1)!.sum,"中等");
    const pending=record("23",null,"低");

    const result=evaluatePredictions([exact,top3,miss,pending]);
    expect(result.sampleSize).toBe(3);
    expect(result.exactHitRate).toBeCloseTo(1/3);
    expect(result.top3HitRate).toBeCloseTo(2/3);
    expect(result.top5HitRate).toBeCloseTo(2/3);
    expect(result.meanAbsoluteError).toBeCloseTo((0+Math.abs(top3.recommendedSum-top3.actualSum!)+Math.abs(miss.recommendedSum-miss.actualSum!))/3);
    expect(result.confidencePerformance.find((group)=>group.confidenceLabel==="中等")?.sampleSize).toBe(2);
    expect(result.confidencePerformance.find((group)=>group.confidenceLabel==="低")?.sampleSize).toBe(0);
  });

  it("returns null rates before any prediction is checked",()=>{
    const result=evaluatePredictions([]);
    expect(result).toMatchObject({sampleSize:0,exactHitRate:null,top3HitRate:null,top5HitRate:null,meanAbsoluteError:null});
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPrediction, MODEL_WEIGHTS } from "@/lib/prediction/model";
import type { Draw } from "@/lib/draw/types";
const draw=(issue:number,sum:number):Draw=>({issue:String(issue),numbers:[Math.min(9,sum),Math.min(9,Math.max(0,sum-9)),Math.max(0,sum-18)],sum,bigSmall:sum>=14?"大":"小",oddEven:sum%2?"单":"双",pattern:"杂六",openTime:null,rawOpenTime:null});
const history=[draw(3,14),draw(2,12),draw(1,14)];
describe("v0.1 Beta prediction",()=>{
 it("uses fixed weights and returns 28 probabilities",()=>{const result=createPrediction(history)!;expect(result.weights).toEqual(MODEL_WEIGHTS);expect(result.distribution).toHaveLength(28);expect(result.distribution.reduce((n,p)=>n+p.probability,0)).toBeCloseTo(1);expect(result.issue).toBe("4")});
 it("is deterministic",()=>expect(createPrediction(history)).toEqual(createPrediction(history)));
 it("requires real history",()=>expect(createPrediction([])).toBeNull());
});

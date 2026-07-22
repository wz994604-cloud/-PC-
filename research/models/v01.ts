import { createPrediction } from "../../src/lib/prediction/model";
import type { Draw } from "../../src/lib/draw/types";
import type { ResearchModel } from "../types";

export const v01Model:ResearchModel={name:"v0.1",predict:({history})=>{
  const draws:Draw[]=history.map(d=>({issue:d.issue,numbers:d.numbers,sum:d.sum,bigSmall:d.sum>=14?"大":"小",oddEven:d.sum%2?"单":"双",pattern:"杂六",openTime:d.openTime,rawOpenTime:d.openTime}));
  const value=createPrediction(draws);
  if(!value) throw new Error("v0.1 requires history");
  const probabilities=value.distribution.map(point=>point.probability);
  return {modelName:"v0.1",scores:[...probabilities],probabilities,confidence:value.confidenceIndex/100,diagnostics:{onlineModelVersion:value.modelVersion}};
}};

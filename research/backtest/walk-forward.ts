import { RESEARCH_CONFIG } from "../config";
import { brier, logLoss } from "../metrics/scoring";
import { rank } from "../models/math";
import type { ResearchDraw, ResearchModel, WalkForwardRecord } from "../types";
export type BacktestOptions={warmup?:number;mode?:"expanding"|"rolling";rollingWindow?:number};
export function walkForward(draws:readonly ResearchDraw[],models:readonly ResearchModel[],options:BacktestOptions={}){
 const warmup=options.warmup??RESEARCH_CONFIG.warmup,records:WalkForwardRecord[]=[];
 for(let t=warmup;t<draws.length;t++){
  const start=options.mode==="rolling"?Math.max(0,t-(options.rollingWindow??RESEARCH_CONFIG.rollingWindow)):0,history=draws.slice(start,t),actual=draws[t];
  const split=t<draws.length*.6?"train":t<draws.length*.8?"validation":"test";
  const recent=history.slice(-20).map(x=>x.sum),mean=recent.reduce((a,b)=>a+b,0)/Math.max(1,recent.length),sd=Math.sqrt(recent.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,recent.length)),volatilityState=sd<3?"low":sd<5?"medium":"high";
  for(const model of models){const prediction=model.predict({history});if(prediction.probabilities.length!==28)throw new Error(`${model.name}: expected 28 probabilities`);const total=prediction.probabilities.reduce((a,b)=>a+b,0);if(Math.abs(total-1)>1e-9||prediction.probabilities.some(p=>p<0||p>1))throw new Error(`${model.name}: invalid probability distribution`);const top5=rank(prediction.probabilities,5),top3=top5.slice(0,3),top1=top5[0];records.push({modelName:model.name,issue:actual.issue,trainingSize:history.length,distribution:[...prediction.probabilities],top1,top3,top5,expectedSum:prediction.probabilities.reduce((a,p,s)=>a+p*s,0),actualSum:actual.sum,top1Hit:top1===actual.sum,top3Hit:top3.includes(actual.sum),top5Hit:top5.includes(actual.sum),absoluteError:Math.abs(top1-actual.sum),brierScore:brier(prediction.probabilities,actual.sum),logLoss:logLoss(prediction.probabilities,actual.sum),confidence:prediction.confidence,split,volatilityState,sampleStage:history.length<RESEARCH_CONFIG.matureSampleSize?"cold-start":"mature"})}
 }return records;
}

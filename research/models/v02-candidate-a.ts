import { RESEARCH_CONFIG } from "../config";
import type { ResearchDraw, ResearchModel } from "../types";
import { normalize, shrink, theoreticalDistribution } from "./math";

const frequency=(history:readonly ResearchDraw[],window:number)=>{const rows=history.slice(-window),counts=Array(28).fill(0);rows.forEach(x=>counts[x.sum]++);return shrink(normalize(counts),theoreticalDistribution,rows.length,RESEARCH_CONFIG.shrinkage.frequencyPrior)};
const omission=(history:readonly ResearchDraw[])=>{
  const current=Array(28).fill(history.length+1), gaps=Array.from({length:28},()=>[] as number[]),last=Array(28).fill(-1);
  history.forEach((draw,index)=>{if(last[draw.sum]>=0)gaps[draw.sum].push(index-last[draw.sum]);last[draw.sum]=index});
  for(let sum=0;sum<28;sum++) if(last[sum]>=0) current[sum]=history.length-1-last[sum];
  const ratios=current.map((gap,sum)=>Math.min(RESEARCH_CONFIG.omissionRatioCap,gap/(gaps[sum].length?gaps[sum].reduce((a,b)=>a+b,0)/gaps[sum].length:Math.max(1,history.length))));
  return {ratios,distribution:shrink(normalize(ratios),theoreticalDistribution,history.length,RESEARCH_CONFIG.shrinkage.omissionPrior)};
};
const transition=(history:readonly ResearchDraw[])=>{
  if(history.length<RESEARCH_CONFIG.featureMinimums.transition)return theoreticalDistribution;
  const counts=Array.from({length:28},()=>Array(28).fill(0));for(let i=1;i<history.length;i++)counts[history[i-1].sum][history[i].sum]++;
  const row=counts[history.at(-1)!.sum], total=row.reduce((a,b)=>a+b,0);
  return shrink(normalize(row),theoreticalDistribution,total,RESEARCH_CONFIG.shrinkage.transitionPrior);
};
const trendShape=(history:readonly ResearchDraw[])=>{
  const recent=history.slice(-20),previous=history.slice(-40,-20),mean=(rows:readonly ResearchDraw[])=>rows.reduce((a,d)=>a+d.sum,0)/Math.max(1,rows.length);
  const recentMean=mean(recent),momentum=previous.length?recentMean-mean(previous):0;
  const variance=recent.reduce((a,d)=>a+(d.sum-recentMean)**2,0)/Math.max(1,recent.length),sigma=Math.max(2,Math.sqrt(variance));
  const center=Math.max(0,Math.min(27,recentMean+Math.max(-2,Math.min(2,momentum))));
  return normalize(theoreticalDistribution.map((prior,sum)=>prior*Math.exp(-((sum-center)**2)/(2*sigma**2))));
};
const stateShape=(history:readonly ResearchDraw[])=>{
  const recent=history.slice(-50),last=recent.at(-1),bigRate=recent.filter(d=>d.sum>=14).length/Math.max(1,recent.length),oddRate=recent.filter(d=>d.sum%2===1).length/Math.max(1,recent.length);
  let reversals=0;for(let i=1;i<recent.length;i++)if((recent[i].sum>=14)!==(recent[i-1].sum>=14))reversals++;
  const reversalRate=reversals/Math.max(1,recent.length-1),favorReverse=reversalRate>.5;
  return normalize(theoreticalDistribution.map((prior,sum)=>{const sizeFit=last&&favorReverse?Number((sum>=14)!==(last.sum>=14)):bigRate>=.5?Number(sum>=14):Number(sum<14);const parityFit=oddRate>=.5?Number(sum%2===1):Number(sum%2===0);return prior*(1+.08*sizeFit+.04*parityFit)}));
};
export const v02CandidateA:ResearchModel={name:"v0.2-candidate-a",predict:({history})=>{
  const w=RESEARCH_CONFIG.v02CandidateA,n=history.length,f20=frequency(history,20),f50=frequency(history,50),f100=frequency(history,100),om=omission(history);
  const hotCold=normalize(f20.map((v,i)=>Math.max(0,theoreticalDistribution[i]+v-f100[i])));
  const reliableTrend=n>=RESEARCH_CONFIG.featureMinimums.trend;
  const trend=reliableTrend?trendShape(history):theoreticalDistribution;
  const trans=transition(history), transitionWeight=n>=RESEARCH_CONFIG.featureMinimums.transition?w.transition:0;
  const state=reliableTrend?stateShape(history):theoreticalDistribution;
  const components=[w.theoretical,w.frequency20,w.frequency50,w.frequency100,w.normalizedOmission,w.hotColdChange,transitionWeight,reliableTrend?w.trendMomentumVolatility:0,reliableTrend?w.stateSignals:0];
  const used=components.reduce((a,b)=>a+b,0), theoryWeight=w.theoretical+(1-used);
  const scores=theoreticalDistribution.map((value,sum)=>value*theoryWeight+f20[sum]*w.frequency20+f50[sum]*w.frequency50+f100[sum]*w.frequency100+om.distribution[sum]*w.normalizedOmission+hotCold[sum]*w.hotColdChange+trans[sum]*transitionWeight+trend[sum]*(reliableTrend?w.trendMomentumVolatility:0)+state[sum]*(reliableTrend?w.stateSignals:0));
  const probabilities=normalize(scores);
  return {modelName:"v0.2-candidate-a",scores,probabilities,confidence:Math.max(...probabilities),diagnostics:{omissionRatios:om.ratios,transitionEnabled:transitionWeight>0,trendEnabled:reliableTrend,effectiveTheoreticalWeight:theoryWeight}};
}};

import type { Draw } from "@/lib/draw/types";
import type { Prediction, ProbabilityPoint } from "./types";

export const MODEL_WEIGHTS = { theoretical: 0.25, recentFrequency: 0.55, omission: 0.2 } as const;
const normalize = (values: number[]) => { const total = values.reduce((a, b) => a + b, 0); return total ? values.map((value) => value / total) : values.map(() => 1 / values.length) };
function theory() { const counts = Array<number>(28).fill(0); for (let a=0;a<10;a++) for(let b=0;b<10;b++) for(let c=0;c<10;c++) counts[a+b+c]++; return counts.map((count)=>count/1000) }

export function createPrediction(draws: Draw[]): Prediction | null {
  if (!draws.length) return null;
  const ordered=[...draws].sort((a,b)=>Number(b.issue)-Number(a.issue));
  const counts=Array<number>(28).fill(0), gaps=Array<number>(28).fill(ordered.length+1);
  ordered.forEach((draw,index)=>{ counts[draw.sum]++; if(gaps[draw.sum]===ordered.length+1) gaps[draw.sum]=index });
  const theoretical=theory(), recentFrequency=normalize(counts), omission=normalize(gaps.map((gap)=>gap+1));
  const probabilities=normalize(theoretical.map((value,sum)=>value*.25+recentFrequency[sum]*.55+omission[sum]*.2));
  const distribution: ProbabilityPoint[]=probabilities.map((probability,sum)=>({sum,theoretical:theoretical[sum],recentFrequency:recentFrequency[sum],omission:omission[sum],probability}));
  const recommendedSum=distribution.reduce((best,point)=>point.probability>best.probability?point:best).sum;
  const top=probabilities[recommendedSum], second=[...probabilities].sort((a,b)=>b-a)[1]??0;
  const confidenceIndex=Math.max(1,Math.min(99,Math.round(45+(top-second)*500+Math.min(ordered.length,300)/10)));
  return { issue:String(Number(ordered[0].issue)+1), recommendedSum, comprehensiveScore:Math.max(1,Math.min(100,Math.round(top*1000))), confidenceIndex,
    confidenceLabel:confidenceIndex>=75?"较高":confidenceIndex>=55?"中等":"低", risk:confidenceIndex>=75?"较低":confidenceIndex>=55?"中等":"较高",
    sampleSize:ordered.length, weights:MODEL_WEIGHTS, distribution, modelVersion:"v0.1 Beta" };
}

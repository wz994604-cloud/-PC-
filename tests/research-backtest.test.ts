import { describe,expect,it } from "vitest";
import { validateDraws,sortDraws } from "../research/data/validate";
import { walkForward } from "../research/backtest/walk-forward";
import { theoreticalBaseline,v01Model,v02CandidateA } from "../research/models";
import type { ResearchDraw,ResearchModel } from "../research/types";
import { RESEARCH_CONFIG } from "../research/config";

const draw=(issue:number,sum:number):ResearchDraw=>({issue:String(issue),openTime:new Date(1_700_000_000_000+issue*210_000).toISOString(),numbers:[Math.min(9,sum),Math.min(9,Math.max(0,sum-9)),Math.max(0,sum-18)],sum});
const rows=(count:number)=>Array.from({length:count},(_,i)=>draw(i+1,(i*7)%28));

describe("offline walk-forward research",()=>{
 it("does not leak the predicted draw into training",()=>{const seen:number[]=[];const spy:ResearchModel={name:"spy",predict:({history})=>{seen.push(history.length);return theoreticalBaseline.predict({history})}};const data=rows(8);walkForward(data,[spy],{warmup:3});expect(seen).toEqual([3,4,5,6,7])});
 it("produces bounded normalized distributions and unique top lists",()=>{const result=walkForward(rows(8),[v02CandidateA],{warmup:3});for(const record of result){expect(record.distribution.reduce((a,b)=>a+b,0)).toBeCloseTo(1,10);expect(record.distribution.every(p=>p>=0&&p<=1)).toBe(true);expect(new Set(record.top3).size).toBe(3);expect(new Set(record.top5).size).toBe(5)}});
 it("shrinks and disables unreliable features for small samples",()=>{const prediction=v02CandidateA.predict({history:rows(10)});expect(prediction.diagnostics).toMatchObject({transitionEnabled:false,trendEnabled:false});expect(prediction.diagnostics?.effectiveTheoreticalWeight).toBeGreaterThan(RESEARCH_CONFIG.v02CandidateA.theoretical)});
 it("caps extreme omission ratios",()=>{const prediction=v02CandidateA.predict({history:rows(20).map((d,i)=>({...d,sum:i%2?13:14,numbers:i%2?[4,4,5]:[4,5,5]} as ResearchDraw))});expect(Math.max(...prediction.diagnostics!.omissionRatios as number[])).toBeLessThanOrEqual(RESEARCH_CONFIG.omissionRatioCap)});
 it("keeps sparse transition probabilities non-extreme",()=>{const prediction=v02CandidateA.predict({history:rows(100)});expect(Math.max(...prediction.probabilities)).toBeLessThan(.2)});
 it("is deterministic",()=>expect(v02CandidateA.predict({history:rows(120)})).toEqual(v02CandidateA.predict({history:rows(120)})));
 it("matches the online v0.1 implementation",()=>{const history=rows(12),prediction=v01Model.predict({history});expect(prediction.diagnostics).toMatchObject({onlineModelVersion:"v0.1 Beta"});expect(prediction.probabilities.reduce((a,b)=>a+b,0)).toBeCloseTo(1)});
 it("supports expanding and fixed rolling windows",()=>{expect(walkForward(rows(8),[theoreticalBaseline],{warmup:3,mode:"expanding"}).at(-1)?.trainingSize).toBe(7);expect(walkForward(rows(8),[theoreticalBaseline],{warmup:3,mode:"rolling",rollingWindow:4}).at(-1)?.trainingSize).toBe(4)});
 it("identifies duplicates, gaps, invalid sums and time disorder",()=>{const data=rows(4);data.push({...draw(4,3),openTime:new Date(0).toISOString()});data[1]={...data[1],sum:27};const report=validateDraws(data);expect(report.duplicateIssues).toEqual(["4"]);expect(report.invalidSums).toContain("2");expect(report.timeOrderAnomalies).toContain("4");expect(validateDraws([draw(1,1),draw(3,3)]).missingIssues).toEqual(["2"]);expect(report.valid).toBe(false)});
 it("sorts by time and issue without mutating input",()=>{const data=[draw(2,2),draw(1,1)].reverse(),copy=[...data];expect(sortDraws(data).map(d=>d.issue)).toEqual(["1","2"]);expect(data).toEqual(copy)});
});

import type { DataQualityReport, ResearchDraw } from "../types";
export function validateDraws(input:readonly ResearchDraw[]):DataQualityReport {
 const seen=new Set<string>(),duplicates=new Set<string>(),invalid:string[]=[],time:string[]=[];
 input.forEach((d,i)=>{if(seen.has(d.issue))duplicates.add(d.issue);seen.add(d.issue);const actual=d.numbers.reduce((a,b)=>a+b,0);if(d.sum<0||d.sum>27||actual!==d.sum||d.numbers.some(n=>!Number.isInteger(n)||n<0||n>9))invalid.push(d.issue);if(i&&new Date(d.openTime).getTime()<new Date(input[i-1].openTime).getTime())time.push(d.issue)});
 const numeric=[...new Set(input.map(d=>Number(d.issue)).filter(Number.isSafeInteger))].sort((a,b)=>a-b),missing:string[]=[];
 for(let i=1;i<numeric.length;i++)if(numeric[i]-numeric[i-1]<=1000)for(let issue=numeric[i-1]+1;issue<numeric[i];issue++)missing.push(String(issue));
 return {sampleSize:input.length,duplicateIssues:[...duplicates],missingIssues:missing,timeOrderAnomalies:time,invalidSums:invalid,valid:!duplicates.size&&!time.length&&!invalid.length};
}
export function sortDraws(input:readonly ResearchDraw[]){return [...input].sort((a,b)=>new Date(a.openTime).getTime()-new Date(b.openTime).getTime()||Number(a.issue)-Number(b.issue))}

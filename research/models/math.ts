export const theoreticalDistribution = (() => {
  const counts=Array<number>(28).fill(0);
  for(let a=0;a<10;a++) for(let b=0;b<10;b++) for(let c=0;c<10;c++) counts[a+b+c]++;
  return counts.map(value=>value/1000);
})();

export function normalize(values: readonly number[]) {
  const safe=values.map(value=>Number.isFinite(value)&&value>0?value:0), total=safe.reduce((a,b)=>a+b,0);
  return total>0?safe.map(value=>value/total):Array(values.length).fill(1/values.length);
}
export function shrink(empirical: readonly number[], prior=theoreticalDistribution, sampleSize=0, priorStrength=50) {
  const weight=sampleSize/(sampleSize+priorStrength);
  return normalize(empirical.map((value,index)=>value*weight+prior[index]*(1-weight)));
}
export function rank(probabilities: readonly number[], count:number) {
  return probabilities.map((probability,sum)=>({probability,sum})).sort((a,b)=>b.probability-a.probability||a.sum-b.sum).slice(0,count).map(x=>x.sum);
}

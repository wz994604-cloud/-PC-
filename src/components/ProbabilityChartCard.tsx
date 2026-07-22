import type { Prediction } from "@/lib/prediction/types";
import { UiIcon } from "./UiIcon";
export function ProbabilityChartCard({prediction}:{prediction:Prediction|null}) {
 const theory=prediction?.distribution.map(p=>p.theoretical*100)??Array(28).fill(0), history=prediction?.distribution.map(p=>p.recentFrequency*100)??Array(28).fill(0), model=prediction?.distribution.map(p=>p.probability*100)??Array(28).fill(0);
 const choice=prediction?.recommendedSum??0,w=560,h=132,base=108,group=w/28,bar=group*.23,max=Math.max(1,...theory,...history,...model),y=(value:number)=>base-value/max*88;
 return <section className="card probability-card" aria-label="和值概率分布"><div className="chart-heading"><h2 className="section-title"><UiIcon name="chart"/>和值概率分布</h2><div className="legend"><i className="theory"/>理论概率<i className="history"/>历史频率<i className="model"/>模型分布</div></div><div className="chart-wrap">
  <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="和值0到27概率分布" preserveAspectRatio="none">
   {[28,55,82,108].map(v=><line key={v} x1="0" x2={w} y1={v} y2={v} className="grid-line"/>)}
   {theory.map((v,i)=><rect key={`t-${i}`} x={i*group+group*.12} y={y(v)} width={bar} height={base-y(v)} rx="1" className="theory-bar"/>)}
   {history.map((v,i)=><rect key={`h-${i}`} x={i*group+group*.385} y={y(v)} width={bar} height={base-y(v)} rx="1" className="history-bar"/>)}
   {model.map((v,i)=><rect key={`m-${i}`} x={i*group+group*.65} y={y(v)} width={bar} height={base-y(v)} rx="1" className={i===choice?"model-bar choice-bar":"model-bar"}/>)}
   <g className="axis-labels">{[0,3,6,9,12,15,18,21,24,27].map(x=><text key={x} x={(x+.5)*group} y="128" textAnchor="middle">{x}</text>)}</g>
  </svg>{prediction&&<span className="choice-label" style={{left:`${(choice+.5)/28*100}%`,top:`${Math.max(0,y(model[choice])-27)/h*100}%`}}>{choice}</span>}
 </div><div className="chart-summary"><span>理论概率 <b>{prediction?theory[choice].toFixed(1):"—"}%</b></span><span>近300期频率 <b>{prediction?history[choice].toFixed(1):"—"}%</b></span><span>模型概率 <b>{prediction?model[choice].toFixed(1):"—"}%</b></span></div></section>;
}

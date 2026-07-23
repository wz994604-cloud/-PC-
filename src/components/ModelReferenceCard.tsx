"use client";
import { useState } from "react";
import type { Prediction } from "@/lib/prediction/types";
import type { PredictionHistoryRecord } from "@/lib/db/prediction-repository";
import { UiIcon } from "./UiIcon";

type HistoryResponse={success:boolean;data?:{records:PredictionHistoryRecord[]}};

export function ModelReferenceCard({prediction}:{prediction:Prediction|null}){
  const [open,setOpen]=useState(false);
  const [records,setRecords]=useState<PredictionHistoryRecord[]|null>(null);
  const [failed,setFailed]=useState(false);
  const toggle=async()=>{
    const next=!open;setOpen(next);
    if(next&&records===null&&!failed){
      try{
        const response=await fetch("/api/prediction/history?limit=10&page=1",{cache:"no-store"});
        const body=await response.json() as HistoryResponse;
        if(!response.ok||!body.success)throw new Error("history unavailable");
        setRecords(body.data?.records??[]);
      }catch{setFailed(true);setRecords([])}
    }
  };
  return <section className={`card model-card${open?" history-open":""}`} aria-label="预测结果">
    <div className="model-heading">
      <h2 className="section-title"><UiIcon name="spark"/>预测结果</h2>
      <button type="button" className="model-history-toggle" aria-expanded={open}
        aria-controls="prediction-history" onClick={toggle}>预测历史 <i>›</i></button>
    </div>
    <div className="model-grid">
      <div className="model-primary"><span>首选和值</span><strong>{prediction?.recommendedSum??"—"}</strong></div>
      <div><span>综合评分</span><strong>{prediction?.comprehensiveScore??"—"}<small>/100</small></strong></div>
      <div><span>信心指数</span><strong className="amber">{prediction?`${prediction.confidenceIndex} · ${prediction.confidenceLabel}`:"数据积累中"}</strong></div>
      <div><span>预测风险</span><strong className="uncertainty">{prediction?.risk??"—"}</strong></div>
    </div>
    {open&&<div className="model-history" id="prediction-history">
      {records===null?<p>正在读取…</p>:failed?<p>预测历史暂时不可用</p>:records.length===0?<p>数据积累中</p>:
        records.map(record=><div className="model-history-row" key={record.issue}>
          <strong>{record.issue}期</strong><span>推荐 {record.recommendedSum}</span>
          <span>{record.actualSum===null?"实际 —":`实际 ${record.actualSum}`}</span>
          <b className={record.hit===true?"hit":record.hit===false?"miss":""}>{record.hit===null?"待开奖":record.hit?"命中":"未命中"}</b>
          <span>评分 {record.comprehensiveScore}</span>
          <time dateTime={record.predictedAt}>{new Date(record.predictedAt).toLocaleString("zh-CN",{hour12:false})}</time>
        </div>)}
    </div>}
  </section>;
}

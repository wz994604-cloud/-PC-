"use client";
import { useState } from "react";
import type { Prediction } from "@/lib/prediction/types";
import type { PredictionHistoryRecord } from "@/lib/db/prediction-repository";
import { UiIcon } from "./UiIcon";
type HistoryResponse={success:boolean;data?:{records:PredictionHistoryRecord[];isAccumulating:boolean}};
export function ModelMetaBar({prediction}:{prediction:Prediction|null}) {
 const [open,setOpen]=useState(false),[records,setRecords]=useState<PredictionHistoryRecord[]|null>(null);
 const toggle=async()=>{const next=!open;setOpen(next);if(next&&records===null){try{const response=await fetch("/api/prediction/history?limit=10&page=1",{cache:"no-store"});const body=await response.json() as HistoryResponse;setRecords(body.success?body.data?.records??[]:[])}catch{setRecords([])}}};
 return <section className={`prediction-history-shell${open?" open":""}`}><footer className="card meta-bar"><div><span>样本量</span><strong>{prediction?`${prediction.sampleSize}期`:"数据积累中"}</strong></div><div><span>模型版本</span><strong>v0.1 Beta</strong></div><div><span>回测窗口</span><strong>最近300期</strong></div><button type="button" aria-expanded={open} aria-controls="prediction-history" onClick={toggle}><UiIcon name="info"/><span>预测历史</span></button></footer>{open&&<div className="card prediction-history" id="prediction-history">{records===null?<p>正在读取…</p>:records.length===0?<p>数据积累中</p>:records.map(record=><div className="prediction-history-row" key={record.issue}><strong>{record.issue}期</strong><span>推荐和值 {record.recommendedSum}</span><span>{record.actualSum===null?"等待开奖":`实际 ${record.actualSum}`}</span><b className={record.hit===true?"hit":""}>{record.hit===null?"待核对":record.hit?"命中":"未命中"}</b></div>)}</div>}</section>;
}

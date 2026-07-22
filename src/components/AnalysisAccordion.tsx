"use client";
import { useState } from "react";
import type { Prediction } from "@/lib/prediction/types";
import { UiIcon } from "./UiIcon";
export function AnalysisAccordion({prediction}:{prediction:Prediction|null}) { const [open,setOpen]=useState(false); return <section className={`card analysis-card${open?" open":""}`}><button aria-expanded={open} onClick={()=>setOpen(!open)}><span><UiIcon name="analysis"/>分析依据</span><i aria-hidden="true">⌄</i></button>{open&&<div className="analysis-body">{prediction?`基于 ${prediction.sampleSize} 期真实开奖，按理论分布 25%、近期频率 55%、遗漏 20% 固定加权。相同历史输入保持相同结果，不使用随机数。`:"数据积累中"}</div>}</section> }

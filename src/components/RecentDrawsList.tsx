"use client";
import { useState } from "react";
import type { Draw } from "@/lib/draw/types";
import { formatSourceDrawTime } from "@/lib/time";
import { UiIcon } from "./UiIcon";
export function RecentDrawsList({draws}:{draws:Draw[]}){
 const [expanded,setExpanded]=useState(false);
 return <section className={`card recent-card${expanded?" expanded":""}`} id="recent-draws" aria-label="最近开奖记录"><div className="recent-heading"><h2 className="section-title"><UiIcon name="clock"/>最近开奖记录</h2><button type="button" aria-expanded={expanded} aria-controls="recent-records" onClick={()=>setExpanded(value=>!value)}>{expanded?"收起":"展开"}<i aria-hidden="true">⌄</i></button></div>{draws.length===0?<div className="empty-records">暂无历史数据</div>:<div className="recent-scroller" id="recent-records">{draws.slice(0,expanded?20:5).map((d,i)=><article className={`draw-tile${i===0?" current":""}`} id={`issue-${d.issue}`} key={d.issue}><strong>{d.issue}期</strong><div className="tile-formula">{d.numbers.join(" + ")} = <b>{d.sum}</b></div><div className="tile-badges"><span className={d.bigSmall==="大"?"hot":"cool"}>{d.bigSmall}</span><span className={d.oddEven==="单"?"odd":"even"}>{d.oddEven}</span></div><time>{formatSourceDrawTime(d.openTime,d.rawOpenTime)}</time></article>)}</div>}</section>;
}

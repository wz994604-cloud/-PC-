import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/draw/types";
import { countdownParts } from "@/lib/time";

export function LatestDrawCard({ response }: { response: ApiSuccess; sourceUnavailable?: boolean }) {
  const { latest, history, nextOpenTime } = response.data;
  const [now, setNow] = useState(0);
  const [finderOpen, setFinderOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchedIssue, setSearchedIssue] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const left = countdownParts(nextOpenTime, now);
  return (
    <section className="card latest-card" aria-label="最新开奖结果">
      <h1 className="draw-title">
        <span className="maple-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false"><path d="M16 2.5 13.5 7l-3-1.6 1.1 5.6-3.4-1.2.7 3.6-5.1-.9 2 4.1-2.5 1.2 6.4 5.3-.9 3.1 6.1-1.1V30h2.2v-4.9l6.1 1.1-.9-3.1 6.4-5.3-2.5-1.2 2-4.1-5.1.9.7-3.6-3.4 1.2 1.1-5.6-3 1.6L16 2.5Z" /></svg>
        </span>
        加拿大28
      </h1>
      <div className="draw-main">
        <div className="draw-stat issue-stat"><span>最新期号</span><a href={`#issue-${latest.issue}`}>{latest.issue}</a><button className={`issue-finder-toggle${finderOpen ? " active" : ""}`} type="button" aria-expanded={finderOpen} aria-controls="issue-finder" onClick={()=>setFinderOpen(value=>!value)}>查找期数 <i aria-hidden="true">⌄</i></button></div>
        <div className="draw-stat countdown" aria-label="下一期开奖倒计时"><span>距离下一期</span><div>{left && left.total > 0 ? <><b>{String(left.minutes).padStart(2, "0")}</b><i>:</i><b>{String(left.seconds).padStart(2, "0")}</b></> : <strong className="drawing">开奖中</strong>}</div><small>自动刷新</small></div>
        <div className="draw-stat result-stat">
          <span>上期开奖</span>
          <div className="equation" aria-label={`${latest.numbers.join("加")}等于${latest.sum}`}>
            {latest.numbers.map((number,index)=><span key={`${latest.issue}-${index}`} className="number-part">{index>0&&<i>+</i>}<b className="number-box">{number}</b></span>)}<i>=</i><b className="sum-box">{latest.sum}</b>
          </div>
          <div className="result-badges"><span className="round size">{latest.bigSmall}</span><span className="round parity">{latest.oddEven}</span></div>
        </div>
      </div>
      {finderOpen && <IssueFinder query={query} searchedIssue={searchedIssue} draws={[latest,...history]} onQuery={setQuery} onSearch={()=>setSearchedIssue(query.trim())} />}
    </section>
  );
}

function IssueFinder({query,searchedIssue,draws,onQuery,onSearch}:{query:string;searchedIssue:string|null;draws:ApiSuccess["data"]["history"];onQuery:(value:string)=>void;onSearch:()=>void}) {
  const result=searchedIssue ? draws.find(draw=>draw.issue===searchedIssue) : null;
  return <div className="issue-finder" id="issue-finder">
    <form onSubmit={event=>{event.preventDefault();onSearch()}}>
      <label htmlFor="issue-query">期号</label>
      <input id="issue-query" inputMode="numeric" value={query} onChange={event=>onQuery(event.target.value.replace(/\D/g,""))} placeholder="请输入期号" />
      <button type="submit">查询</button>
    </form>
    {searchedIssue && (result ? <div className="issue-result"><strong>{result.issue}期</strong><span>{result.numbers.join(" + ")} = <b>{result.sum}</b></span><em>{result.bigSmall} · {result.oddEven}</em></div> : <p className="issue-not-found">当前记录中未找到该期</p>)}
  </div>;
}

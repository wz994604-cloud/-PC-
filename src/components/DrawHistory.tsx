import type { Draw } from "@/lib/draw/types";
import { formatSourceDrawTime } from "@/lib/time";

export function DrawHistory({ draws }: { draws: Draw[] }) {
  if (draws.length === 0) return <div className="state">暂无历史数据</div>;
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">加拿大28历史开奖记录</caption>
        <thead><tr><th>期号</th><th>号码</th><th>和值</th><th>形态</th><th>时间</th></tr></thead>
        <tbody>
          {draws.map((draw, index) => (
            <tr key={draw.issue} id={`issue-${draw.issue}`} className={index === 0 ? "current-row" : undefined}>
              <td><a className="issue-link" href={`#issue-${draw.issue}`}>{draw.issue}</a></td>
              <td className="formula">{draw.numbers.join("+")}={draw.sum}</td>
              <td><span className={`value-badge ${draw.bigSmall === "大" ? "big" : "small"}`}>{draw.sum}</span><span className={`parity-badge ${draw.oddEven === "单" ? "odd" : "even"}`}>{draw.oddEven}</span></td>
              <td><span className={`pattern-badge pattern-${draw.pattern}`}>{draw.pattern}</span></td>
              <td className="time">{formatSourceDrawTime(draw.openTime, draw.rawOpenTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

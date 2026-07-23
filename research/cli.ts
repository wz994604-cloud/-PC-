import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRealDraws } from "./data/load";
import { sortDraws, validateDraws } from "./data/validate";
import { walkForward } from "./backtest/walk-forward";
import { summarize } from "./metrics/summary";
import { theoreticalBaseline,theoreticalModeBaseline,v01Model,v02CandidateA,v02CandidateB } from "./models";
const input=process.argv[2];if(!input)throw new Error("Usage: npm run research:backtest -- <real-history.sqlite|json|csv> [expanding|rolling]");
const raw=loadRealDraws(resolve(input)),quality=validateDraws(raw);writeFileSync("research/reports/data-quality.generated.json",JSON.stringify(quality,null,2));
if(!quality.valid)throw new Error("Real history failed quality checks; see data-quality.generated.json");
const draws=sortDraws(raw);if(draws.length<100){console.log(`真实历史仅 ${draws.length} 期：只完成数据检查，不输出模型比较结论`);process.exit(0)}
const records=walkForward(draws,[theoreticalBaseline,theoreticalModeBaseline,v01Model,v02CandidateA,v02CandidateB],{mode:process.argv[3]==="rolling"?"rolling":"expanding"});
writeFileSync("research/reports/backtest.generated.json",JSON.stringify({quality,summary:summarize(records),records},null,2));
console.log(`完成 ${draws.length} 期真实数据走步回测；锁定测试集结果仅供最终参数确定后的评估，不用于调参`);

import type { Prediction } from "@/lib/prediction/types";
import { UiIcon } from "./UiIcon";
export function ModelReferenceCard({prediction}:{prediction:Prediction|null}) {
 return <section className="card model-card" aria-label="模型参考结果"><h2 className="section-title"><UiIcon name="spark"/>模型参考结果</h2><div className="model-grid">
  <div className="model-primary"><span>首选和值</span><strong>{prediction?.recommendedSum??"—"}</strong></div>
  <div><span>综合评分</span><strong>{prediction?.comprehensiveScore??"—"}<small>/100</small></strong></div>
  <div><span>信心指数</span><strong className="amber">{prediction?`${prediction.confidenceIndex} · ${prediction.confidenceLabel}`:"数据积累中"}</strong></div>
  <div><span>预测风险</span><strong className="uncertainty">{prediction?.risk??"—"}</strong></div>
 </div></section>;
}

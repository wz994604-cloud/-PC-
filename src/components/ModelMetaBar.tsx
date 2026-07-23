import type { Prediction } from "@/lib/prediction/types";

export function ModelMetaBar({prediction}:{prediction:Prediction|null}){
  return <footer className="card meta-bar">
    <div><span>样本量</span><strong>{prediction?`${prediction.sampleSize}期`:"数据积累中"}</strong></div>
    <div><span>模型版本</span><strong>v0.1 Beta</strong></div>
    <div><span>回测窗口</span><strong>最近300期</strong></div>
    <div><span>持久化</span><strong>Neon</strong></div>
  </footer>;
}

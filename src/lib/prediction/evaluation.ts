import type { PredictionHistoryRecord } from "@/lib/db/prediction-repository";
import type { ConfidenceLabel } from "./types";

export type MetricSummary = {
  sampleSize: number;
  exactHits: number;
  exactHitRate: number | null;
  top3Hits: number;
  top3HitRate: number | null;
  top5Hits: number;
  top5HitRate: number | null;
  meanAbsoluteError: number | null;
};

export type PredictionEvaluation = MetricSummary & {
  confidencePerformance: Array<{ confidenceLabel: ConfidenceLabel } & MetricSummary>;
};

const rate = (hits: number, total: number) => total ? hits / total : null;

function summarize(records: PredictionHistoryRecord[]): MetricSummary {
  const checked = records.filter((record): record is PredictionHistoryRecord & { actualSum: number } => record.actualSum !== null);
  let exactHits=0,top3Hits=0,top5Hits=0,absoluteError=0;

  for (const record of checked) {
    const ranked = [...record.distribution].sort((a,b)=>b.probability-a.probability||a.sum-b.sum);
    if (record.actualSum===record.recommendedSum) exactHits++;
    if (ranked.slice(0,3).some((point)=>point.sum===record.actualSum)) top3Hits++;
    if (ranked.slice(0,5).some((point)=>point.sum===record.actualSum)) top5Hits++;
    absoluteError += Math.abs(record.recommendedSum-record.actualSum);
  }

  return {
    sampleSize:checked.length,
    exactHits,
    exactHitRate:rate(exactHits,checked.length),
    top3Hits,
    top3HitRate:rate(top3Hits,checked.length),
    top5Hits,
    top5HitRate:rate(top5Hits,checked.length),
    meanAbsoluteError:checked.length?absoluteError/checked.length:null,
  };
}

export function evaluatePredictions(records: PredictionHistoryRecord[]): PredictionEvaluation {
  const labels:ConfidenceLabel[]=["低","中等","较高"];
  return {
    ...summarize(records),
    confidencePerformance:labels.map((confidenceLabel)=>({
      confidenceLabel,
      ...summarize(records.filter((record)=>record.confidenceLabel===confidenceLabel)),
    })),
  };
}

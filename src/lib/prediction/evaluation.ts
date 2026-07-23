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
  brierScore: number | null;
  concentration: {
    window: number;
    mostRecommendedSum: number | null;
    share: number | null;
    warning: boolean;
  };
  confidencePerformance: Array<{ confidenceLabel: ConfidenceLabel } & MetricSummary>;
};

const rate = (hits: number, total: number) => total ? hits / total : null;
type EvaluationRecord = Pick<PredictionHistoryRecord,
  "actualSum" | "recommendedSum" | "distribution" | "confidenceLabel">;

function summarize(records: EvaluationRecord[]): MetricSummary {
  const checked = records.filter((record): record is EvaluationRecord & { actualSum: number } => record.actualSum !== null);
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

export function evaluatePredictions(records: EvaluationRecord[]): PredictionEvaluation {
  const labels:ConfidenceLabel[]=["低","中等","较高"];
  return {
    ...summarize(records),
    brierScore: calculateBrier(records),
    concentration: calculateConcentration(records),
    confidencePerformance:labels.map((confidenceLabel)=>({
      confidenceLabel,
      ...summarize(records.filter((record)=>record.confidenceLabel===confidenceLabel)),
    })),
  };
}

function calculateBrier(records: EvaluationRecord[]) {
  const checked = records.filter((record): record is EvaluationRecord & { actualSum: number } => record.actualSum !== null);
  if (!checked.length) return null;
  return checked.reduce((total, record) => total + record.distribution.reduce((sum, point) =>
    sum + (point.probability - Number(point.sum === record.actualSum)) ** 2, 0), 0) / checked.length;
}

function calculateConcentration(records: EvaluationRecord[]) {
  const recent = records.slice(0, 50);
  if (!recent.length) return { window: 0, mostRecommendedSum: null, share: null, warning: false };
  const counts = new Map<number, number>();
  recent.forEach((record) => counts.set(record.recommendedSum, (counts.get(record.recommendedSum) ?? 0) + 1));
  const [mostRecommendedSum, count] = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const share = count / recent.length;
  return { window: recent.length, mostRecommendedSum, share, warning: recent.length >= 10 && share >= 0.5 };
}

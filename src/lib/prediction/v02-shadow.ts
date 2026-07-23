import type { Draw } from "@/lib/draw/types";
import { v02CandidateB } from "../../../research/models/v02-candidate-b";
import { v02CandidateC } from "../../../research/models/v02-candidate-c";
import type { ResearchModel } from "../../../research/types";

export const V02_SHADOW_MODEL_VERSION = "v0.2-candidate-b" as const;
export const V02_CALIBRATION_MODEL_VERSION = "v0.2-candidate-c" as const;

export type V02ShadowPrediction = {
  targetIssue: string;
  basedOnIssue: string;
  modelVersion: typeof V02_SHADOW_MODEL_VERSION | typeof V02_CALIBRATION_MODEL_VERSION;
  recommendedSum: number;
  top3: number[];
  top5: number[];
  probabilityDistribution: number[];
  confidence: number;
  diagnostics: Record<string, unknown>;
  sampleSize: number;
};

function createShadowPrediction(
  draws: Draw[],
  model: ResearchModel,
  modelVersion: V02ShadowPrediction["modelVersion"],
): V02ShadowPrediction | null {
  if (!draws.length) return null;
  const ordered = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));
  const latest = ordered.at(-1)!;
  const prediction = model.predict({
    history: ordered.map((draw) => ({
      issue: draw.issue,
      openTime: draw.openTime ?? new Date(0).toISOString(),
      numbers: draw.numbers,
      sum: draw.sum,
    })),
  });
  const ranked = prediction.probabilities
    .map((probability, sum) => ({ sum, probability }))
    .sort((a, b) => b.probability - a.probability || a.sum - b.sum);
  const recent = ordered.slice(-300);
  const counts = Array<number>(28).fill(0);
  recent.forEach((draw) => counts[draw.sum]++);
  const recentFrequency = counts.map((count) => count / Math.max(1, recent.length));

  return {
    targetIssue: String(Number(latest.issue) + 1),
    basedOnIssue: latest.issue,
    modelVersion,
    recommendedSum: ranked[0].sum,
    top3: ranked.slice(0, 3).map(({ sum }) => sum),
    top5: ranked.slice(0, 5).map(({ sum }) => sum),
    probabilityDistribution: prediction.probabilities,
    confidence: prediction.confidence,
    diagnostics: { ...(prediction.diagnostics ?? {}), recentFrequency },
    sampleSize: ordered.length,
  };
}

export function createV02ShadowPrediction(draws: Draw[]) {
  return createShadowPrediction(draws, v02CandidateB, V02_SHADOW_MODEL_VERSION);
}

export function createV02CalibrationPrediction(draws: Draw[]) {
  return createShadowPrediction(draws, v02CandidateC, V02_CALIBRATION_MODEL_VERSION);
}

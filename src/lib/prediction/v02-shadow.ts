import type { Draw } from "@/lib/draw/types";
import { v02CandidateB } from "../../../research/models/v02-candidate-b";

export const V02_SHADOW_MODEL_VERSION = "v0.2-candidate-b" as const;

export type V02ShadowPrediction = {
  targetIssue: string;
  basedOnIssue: string;
  modelVersion: typeof V02_SHADOW_MODEL_VERSION;
  recommendedSum: number;
  top3: number[];
  top5: number[];
  probabilityDistribution: number[];
  confidence: number;
  diagnostics: Record<string, unknown>;
  sampleSize: number;
};

export function createV02ShadowPrediction(draws: Draw[]): V02ShadowPrediction | null {
  if (!draws.length) return null;
  const ordered = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));
  const latest = ordered.at(-1)!;
  const prediction = v02CandidateB.predict({
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
    modelVersion: V02_SHADOW_MODEL_VERSION,
    recommendedSum: ranked[0].sum,
    top3: ranked.slice(0, 3).map(({ sum }) => sum),
    top5: ranked.slice(0, 5).map(({ sum }) => sum),
    probabilityDistribution: prediction.probabilities,
    confidence: prediction.confidence,
    diagnostics: { ...(prediction.diagnostics ?? {}), recentFrequency },
    sampleSize: ordered.length,
  };
}

import { describe, expect, it } from "vitest";
import { selectV02Model } from "@/lib/prediction/model-selection";
import type { PredictionEvaluation } from "@/lib/prediction/evaluation";

const evaluation = (
  sampleSize: number,
  overrides: Partial<PredictionEvaluation> = {},
): PredictionEvaluation => ({
  sampleSize,
  exactHits: 0,
  exactHitRate: 0,
  top3Hits: 0,
  top3HitRate: 0.3,
  top5Hits: 0,
  top5HitRate: 0.5,
  meanAbsoluteError: 4,
  brierScore: 0.9,
  concentration: { window: 50, mostRecommendedSum: 14, share: 0.4, warning: false },
  confidencePerformance: [],
  ...overrides,
});

describe("v0.2 model selection guard", () => {
  it("keeps B while shadow data is accumulating", () => {
    expect(selectV02Model(evaluation(99), evaluation(99))).toMatchObject({
      activeModelVersion: "v0.2-candidate-b",
      reason: "accumulating",
    });
  });

  it("promotes only a materially better, non-concentrated candidate", () => {
    expect(selectV02Model(evaluation(100), evaluation(100, {
      brierScore: 0.85,
      meanAbsoluteError: 3.8,
      top3HitRate: 0.32,
    }))).toMatchObject({
      activeModelVersion: "v0.2-candidate-c",
      reason: "candidate_promoted",
    });
  });

  it("rolls back a concentrated candidate", () => {
    expect(selectV02Model(evaluation(100), evaluation(100, {
      brierScore: 0.8,
      meanAbsoluteError: 3.5,
      top3HitRate: 0.35,
      concentration: { window: 50, mostRecommendedSum: 14, share: 0.8, warning: true },
    }))).toMatchObject({
      activeModelVersion: "v0.2-candidate-b",
      reason: "candidate_rolled_back",
    });
  });
});

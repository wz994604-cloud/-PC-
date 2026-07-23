import { getCheckedShadowPredictions } from "@/lib/db/shadow-prediction-repository";
import { RESEARCH_CONFIG } from "../../../research/config";
import {
  V02_CALIBRATION_MODEL_VERSION,
  V02_SHADOW_MODEL_VERSION,
} from "./v02-shadow";
import { evaluatePredictions, type PredictionEvaluation } from "./evaluation";

export type ModelSelection = {
  activeModelVersion: typeof V02_SHADOW_MODEL_VERSION | typeof V02_CALIBRATION_MODEL_VERSION;
  reason: "accumulating" | "candidate_promoted" | "candidate_rolled_back";
  settledSamples: { baseline: number; candidate: number };
};

export function selectV02Model(
  baseline: PredictionEvaluation,
  candidate: PredictionEvaluation,
): ModelSelection {
  const settledSamples = { baseline: baseline.sampleSize, candidate: candidate.sampleSize };
  if (
    baseline.sampleSize < RESEARCH_CONFIG.calibration.minimumShadowSettled
    || candidate.sampleSize < RESEARCH_CONFIG.calibration.minimumShadowSettled
  ) {
    return { activeModelVersion: V02_SHADOW_MODEL_VERSION, reason: "accumulating", settledSamples };
  }
  const candidatePasses =
    candidate.brierScore !== null
    && baseline.brierScore !== null
    && candidate.meanAbsoluteError !== null
    && baseline.meanAbsoluteError !== null
    && candidate.top3HitRate !== null
    && baseline.top3HitRate !== null
    && candidate.concentration.share !== null
    && candidate.brierScore <= baseline.brierScore * 0.98
    && candidate.meanAbsoluteError <= baseline.meanAbsoluteError
    && candidate.top3HitRate >= baseline.top3HitRate
    && candidate.concentration.share <= RESEARCH_CONFIG.calibration.maximumRecommendedShare;
  return candidatePasses
    ? { activeModelVersion: V02_CALIBRATION_MODEL_VERSION, reason: "candidate_promoted", settledSamples }
    : { activeModelVersion: V02_SHADOW_MODEL_VERSION, reason: "candidate_rolled_back", settledSamples };
}

export async function resolveV02ModelSelection() {
  const [baseline, candidate] = await Promise.all([
    getCheckedShadowPredictions(V02_SHADOW_MODEL_VERSION),
    getCheckedShadowPredictions(V02_CALIBRATION_MODEL_VERSION),
  ]);
  return selectV02Model(evaluatePredictions(baseline), evaluatePredictions(candidate));
}

import { getDrawHistory } from "@/lib/db/draw-repository";
import {
  getPrediction,
  reconcilePredictions,
  savePredictionOnce,
  type PredictionHistoryRecord,
} from "@/lib/db/prediction-repository";
import { errorDetails, logPredictionEvent } from "@/lib/observability/prediction-log";
import { createPrediction } from "./model";
import {
  reconcileShadowPredictions,
  saveShadowPredictionOnce,
} from "@/lib/db/shadow-prediction-repository";
import { createV02ShadowPrediction } from "./v02-shadow";

export type PredictionCycleResult = {
  prediction: PredictionHistoryRecord | null;
  predictionInserted: boolean;
  reconciledCount: number;
  reconciled: Awaited<ReturnType<typeof reconcilePredictions>>;
  shadow: {
    targetIssue: string | null;
    inserted: boolean;
    reconciledCount: number;
    error: boolean;
  };
};

export async function runPredictionCycle(now = new Date().toISOString()): Promise<PredictionCycleResult> {
  try {
    const reconciled = await reconcilePredictions(now);
    for (const result of reconciled) {
      logPredictionEvent("prediction.reconciled", result);
    }

    const history = await getDrawHistory(300);
    const candidate = createPrediction(history);
    let shadow: PredictionCycleResult["shadow"] = {
      targetIssue: null,
      inserted: false,
      reconciledCount: 0,
      error: false,
    };
    try {
      const shadowReconciled = await reconcileShadowPredictions(now);
      const shadowCandidate = createV02ShadowPrediction(history);
      if (shadowCandidate) {
        const saved = await saveShadowPredictionOnce(shadowCandidate, now);
        shadow = {
          targetIssue: saved.targetIssue,
          inserted: saved.inserted,
          reconciledCount: shadowReconciled.length,
          error: false,
        };
        logPredictionEvent(saved.inserted ? "shadow.saved" : "shadow.save_skipped", {
          issue: saved.targetIssue,
          modelVersion: shadowCandidate.modelVersion,
          reconciledCount: shadowReconciled.length,
        });
      }
    } catch (error) {
      shadow = { ...shadow, error: true };
      logPredictionEvent("shadow.failed", errorDetails(error));
    }
    if (!candidate) {
      return { prediction: null, predictionInserted: false, reconciledCount: reconciled.length, reconciled, shadow };
    }

    logPredictionEvent("prediction.generated", {
      issue: candidate.issue,
      recommendedSum: candidate.recommendedSum,
      sampleSize: candidate.sampleSize,
      modelVersion: candidate.modelVersion,
    });

    const existing = await getPrediction(candidate.issue);
    if (existing) {
      logPredictionEvent("prediction.save_skipped", { issue: candidate.issue, reason: "duplicate_issue" });
      return { prediction: existing, predictionInserted: false, reconciledCount: reconciled.length, reconciled, shadow };
    }

    try {
      const saved = await savePredictionOnce(candidate, now);
      logPredictionEvent(saved.inserted ? "prediction.saved" : "prediction.save_skipped", {
        issue: candidate.issue,
        predictedAt: saved.record.predictedAt,
        ...(saved.inserted ? {} : { reason: "duplicate_issue_race" }),
      });
      return { prediction: saved.record, predictionInserted: saved.inserted, reconciledCount: reconciled.length, reconciled, shadow };
    } catch (error) {
      logPredictionEvent("prediction.save_failed", { issue: candidate.issue, ...errorDetails(error) });
      throw error;
    }
  } catch (error) {
    logPredictionEvent("prediction.cycle_failed", errorDetails(error));
    throw error;
  }
}

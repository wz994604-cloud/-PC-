import { getDrawHistory } from "@/lib/db/draw-repository";
import {
  getPrediction,
  reconcilePredictions,
  savePredictionOnce,
  type PredictionHistoryRecord,
} from "@/lib/db/prediction-repository";
import { errorDetails, logPredictionEvent } from "@/lib/observability/prediction-log";
import { createPrediction } from "./model";

export type PredictionCycleResult = {
  prediction: PredictionHistoryRecord | null;
  predictionInserted: boolean;
  reconciledCount: number;
  reconciled: Awaited<ReturnType<typeof reconcilePredictions>>;
};

export async function runPredictionCycle(now = new Date().toISOString()): Promise<PredictionCycleResult> {
  try {
    const reconciled = await reconcilePredictions(now);
    for (const result of reconciled) {
      logPredictionEvent("prediction.reconciled", result);
    }

    const candidate = createPrediction(await getDrawHistory(300));
    if (!candidate) {
      return { prediction: null, predictionInserted: false, reconciledCount: reconciled.length, reconciled };
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
      return { prediction: existing, predictionInserted: false, reconciledCount: reconciled.length, reconciled };
    }

    try {
      const saved = await savePredictionOnce(candidate, now);
      logPredictionEvent(saved.inserted ? "prediction.saved" : "prediction.save_skipped", {
        issue: candidate.issue,
        predictedAt: saved.record.predictedAt,
        ...(saved.inserted ? {} : { reason: "duplicate_issue_race" }),
      });
      return { prediction: saved.record, predictionInserted: saved.inserted, reconciledCount: reconciled.length, reconciled };
    } catch (error) {
      logPredictionEvent("prediction.save_failed", { issue: candidate.issue, ...errorDetails(error) });
      throw error;
    }
  } catch (error) {
    logPredictionEvent("prediction.cycle_failed", errorDetails(error));
    throw error;
  }
}

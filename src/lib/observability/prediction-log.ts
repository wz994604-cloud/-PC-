export type PredictionLogEvent =
  | "prediction.generated"
  | "prediction.saved"
  | "prediction.save_skipped"
  | "prediction.reconciled"
  | "prediction.save_failed"
  | "prediction.cycle_failed";

type LogDetails = Record<string, unknown>;

export function logPredictionEvent(event: PredictionLogEvent, details: LogDetails = {}) {
  const entry = JSON.stringify({
    scope: "prediction",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });

  if (event.endsWith("failed")) {
    console.error(entry);
    return;
  }

  console.info(entry);
}

export function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }

  return { errorName: "UnknownError", errorMessage: String(error) };
}

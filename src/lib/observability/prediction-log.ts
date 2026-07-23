export type PredictionLogEvent =
  | "cycle.started" | "cycle.finished" | "auth.failed"
  | "draw.sync_succeeded" | "draw.duplicate_skipped"
  | "source.timeout" | "source.invalid_response"
  | "prediction.generated" | "prediction.saved" | "prediction.save_skipped"
  | "prediction.reconciled" | "prediction.save_failed"
  | "shadow.saved" | "shadow.save_skipped" | "shadow.failed"
  | "calibration.saved" | "calibration.save_skipped"
  | "database.error" | "prediction.cycle_failed";

const forbidden=/secret|token|cookie|authorization|database_url|raw_data/i;

export function logPredictionEvent(event:PredictionLogEvent,details:Record<string,unknown>={}){
  const safe=Object.fromEntries(Object.entries(details).filter(([key])=>!forbidden.test(key)));
  const entry=JSON.stringify({scope:"prediction-cycle",event,timestamp:new Date().toISOString(),...safe});
  if(event.endsWith("failed")||event==="database.error"||event.startsWith("source.")) console.error(entry);
  else console.info(entry);
}

export function errorDetails(error:unknown){
  if(error instanceof Error)return {errorName:error.name,errorMessage:error.message};
  return {errorName:"UnknownError",errorMessage:String(error)};
}

import type { Prediction } from "@/lib/prediction/types";
import { getDatabase } from "./sqlite";

export type PredictionHistoryRecord = Prediction & { predictedAt: string; actualSum: number | null; hit: boolean | null; checkedAt: string | null };
export type PredictionSaveResult = { record: PredictionHistoryRecord; inserted: boolean };
export type ReconciledPrediction = { issue: string; actualSum: number; hit: boolean; checkedAt: string };
type Row = { issue:string;recommended_sum:number;comprehensive_score:number;confidence_index:number;confidence_label:Prediction["confidenceLabel"];risk:Prediction["risk"];sample_size:number;weights_json:string;distribution_json:string;model_version:"v0.1 Beta";predicted_at:string;actual_sum:number|null;hit:number|null;checked_at:string|null };
const fromRow=(row:Row):PredictionHistoryRecord=>({issue:row.issue,recommendedSum:row.recommended_sum,comprehensiveScore:row.comprehensive_score,confidenceIndex:row.confidence_index,confidenceLabel:row.confidence_label,risk:row.risk,sampleSize:row.sample_size,weights:JSON.parse(row.weights_json),distribution:JSON.parse(row.distribution_json),modelVersion:row.model_version,predictedAt:row.predicted_at,actualSum:row.actual_sum,hit:row.hit===null?null:Boolean(row.hit),checkedAt:row.checked_at});

export function savePredictionOnce(prediction:Prediction, predictedAt=new Date().toISOString()): PredictionSaveResult {
 const db=getDatabase();
 const result=db.prepare(`INSERT INTO prediction_history (issue,recommended_sum,comprehensive_score,confidence_index,confidence_label,risk,sample_size,weights_json,distribution_json,model_version,predicted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(issue) DO NOTHING`).run(prediction.issue,prediction.recommendedSum,prediction.comprehensiveScore,prediction.confidenceIndex,prediction.confidenceLabel,prediction.risk,prediction.sampleSize,JSON.stringify(prediction.weights),JSON.stringify(prediction.distribution),prediction.modelVersion,predictedAt);
 return {record:getPrediction(prediction.issue)!,inserted:Number(result.changes)===1};
}
export function getPrediction(issue:string) { const row=getDatabase().prepare("SELECT * FROM prediction_history WHERE issue = ?").get(issue) as Row|undefined; return row?fromRow(row):null }
export function getPredictionHistory(limit=20,offset=0) { const db=getDatabase(),safeLimit=Math.max(1,Math.min(100,Math.trunc(limit))),safeOffset=Math.max(0,Math.trunc(offset)); const records=(db.prepare("SELECT * FROM prediction_history ORDER BY CAST(issue AS INTEGER) DESC LIMIT ? OFFSET ?").all(safeLimit,safeOffset) as Row[]).map(fromRow); const total=Number((db.prepare("SELECT COUNT(*) AS count FROM prediction_history").get() as {count:number}).count); return {records,total} }
export function getCheckedPredictions() {
 return (getDatabase().prepare("SELECT * FROM prediction_history WHERE actual_sum IS NOT NULL ORDER BY CAST(issue AS INTEGER) ASC").all() as Row[]).map(fromRow);
}
export function reconcilePredictions(checkedAt=new Date().toISOString()): ReconciledPrediction[] {
 const db=getDatabase();
 const pending=db.prepare(`SELECT prediction_history.issue AS issue, draw_records.sum AS actual_sum,
   CASE WHEN prediction_history.recommended_sum=draw_records.sum THEN 1 ELSE 0 END AS hit
   FROM prediction_history JOIN draw_records ON draw_records.issue=prediction_history.issue
   WHERE prediction_history.actual_sum IS NULL`).all() as Array<{issue:string;actual_sum:number;hit:number}>;
 if (!pending.length) return [];
 const update=db.prepare(`UPDATE prediction_history SET actual_sum=?, hit=?, checked_at=? WHERE issue=? AND actual_sum IS NULL`);
 const reconciled:ReconciledPrediction[]=[];
 db.exec("BEGIN");
 try {
  for (const row of pending) {
   const result=update.run(row.actual_sum,row.hit,checkedAt,row.issue);
   if (Number(result.changes)===1) reconciled.push({issue:row.issue,actualSum:row.actual_sum,hit:Boolean(row.hit),checkedAt});
  }
  db.exec("COMMIT");
  return reconciled;
 } catch (error) {
  db.exec("ROLLBACK");
  throw error;
 }
}

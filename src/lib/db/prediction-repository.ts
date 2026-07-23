import type { Prediction, ProbabilityPoint } from "@/lib/prediction/types";
import { ensureNeonSchema, getNeonSql, hasNeonDatabase } from "./neon";
import { getDatabase } from "./sqlite";

export type PredictionStatus = "pending" | "settled";
export type PredictionHistoryRecord = Prediction & {
  basedOnIssue?:string;top3?:ProbabilityPoint[];top5?:ProbabilityPoint[];status?:PredictionStatus;
  predictedAt:string;actualSum:number|null;hit:boolean|null;checkedAt:string|null;
};
export type PredictionSaveResult={record:PredictionHistoryRecord;inserted:boolean};
export type ReconciledPrediction={issue:string;actualSum:number;hit:boolean;checkedAt:string};
type Row={
  target_issue:string;based_on_issue:string;model_version:string;recommended_sum:number;
  top3:ProbabilityPoint[]|string;top5:ProbabilityPoint[]|string;score:number;confidence:number;
  confidence_label:Prediction["confidenceLabel"];risk_level:Prediction["risk"];sample_size:number;
  weights:Prediction["weights"]|string;probability_distribution:Prediction["distribution"]|string;
  status:PredictionStatus;generated_at:string;actual_sum:number|null;is_hit:boolean|number|null;settled_at:string|null;
};
type LegacyRow={
  issue:string;recommended_sum:number;comprehensive_score:number;confidence_index:number;
  confidence_label:Prediction["confidenceLabel"];risk:Prediction["risk"];sample_size:number;
  weights_json:Prediction["weights"]|string;distribution_json:Prediction["distribution"]|string;
  model_version:"v0.1 Beta";predicted_at:string;actual_sum:number|null;hit:boolean|number|null;checked_at:string|null;
};
const parse=<T>(value:T|string):T=>typeof value==="string"?JSON.parse(value) as T:value;
const rank=(prediction:Prediction,count:number)=>[...prediction.distribution]
  .sort((a,b)=>b.probability-a.probability||a.sum-b.sum).slice(0,count);
const fromRow=(row:Row):PredictionHistoryRecord=>({
  issue:row.target_issue,basedOnIssue:row.based_on_issue,recommendedSum:row.recommended_sum,
  comprehensiveScore:row.score,confidenceIndex:row.confidence,confidenceLabel:row.confidence_label,
  risk:row.risk_level,sampleSize:row.sample_size,weights:parse(row.weights),
  distribution:parse(row.probability_distribution),modelVersion:"v0.1 Beta",
  top3:parse(row.top3),top5:parse(row.top5),status:row.status,
  predictedAt:new Date(row.generated_at).toISOString(),actualSum:row.actual_sum,
  hit:row.is_hit===null?null:Boolean(row.is_hit),
  checkedAt:row.settled_at?new Date(row.settled_at).toISOString():null,
});
const fromLegacy=(row:LegacyRow):PredictionHistoryRecord=>{
  const distribution=parse(row.distribution_json);
  return {issue:row.issue,basedOnIssue:String(Number(row.issue)-1),recommendedSum:row.recommended_sum,
    comprehensiveScore:row.comprehensive_score,confidenceIndex:row.confidence_index,
    confidenceLabel:row.confidence_label,risk:row.risk,sampleSize:row.sample_size,
    weights:parse(row.weights_json),distribution,modelVersion:row.model_version,
    top3:[...distribution].sort((a,b)=>b.probability-a.probability).slice(0,3),
    top5:[...distribution].sort((a,b)=>b.probability-a.probability).slice(0,5),
    status:row.actual_sum===null?"pending":"settled",predictedAt:row.predicted_at,
    actualSum:row.actual_sum,hit:row.hit===null?null:Boolean(row.hit),checkedAt:row.checked_at};
};

export async function savePredictionOnce(prediction:Prediction,predictedAt=new Date().toISOString()):Promise<PredictionSaveResult>{
  const basedOnIssue=String(Number(prediction.issue)-1),top3=rank(prediction,3),top5=rank(prediction,5);
  if(hasNeonDatabase()){
    await ensureNeonSchema();
    const rows=await getNeonSql()`INSERT INTO prediction_records
      (target_issue,based_on_issue,model_version,recommended_sum,top3,top5,score,confidence,
       confidence_label,risk_level,sample_size,weights,probability_distribution,status,generated_at)
      VALUES(${prediction.issue},${basedOnIssue},'v0.1',${prediction.recommendedSum},${JSON.stringify(top3)}::jsonb,
       ${JSON.stringify(top5)}::jsonb,${prediction.comprehensiveScore},${prediction.confidenceIndex},
       ${prediction.confidenceLabel},${prediction.risk},${prediction.sampleSize},${JSON.stringify(prediction.weights)}::jsonb,
       ${JSON.stringify(prediction.distribution)}::jsonb,'pending',${predictedAt}::timestamptz)
      ON CONFLICT(target_issue) DO NOTHING RETURNING *` as Row[];
    if(rows[0]) return {record:fromRow(rows[0]),inserted:true};
    const existing=await getPrediction(prediction.issue);
    if(!existing) throw new Error(`Prediction ${prediction.issue} was not saved`);
    return {record:existing,inserted:false};
  }
  const db=getDatabase();
  const result=db.prepare(`INSERT INTO prediction_history
    (issue,recommended_sum,comprehensive_score,confidence_index,confidence_label,risk,sample_size,
     weights_json,distribution_json,model_version,predicted_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(issue) DO NOTHING`).run(prediction.issue,prediction.recommendedSum,prediction.comprehensiveScore,
      prediction.confidenceIndex,prediction.confidenceLabel,prediction.risk,prediction.sampleSize,
      JSON.stringify(prediction.weights),JSON.stringify(prediction.distribution),prediction.modelVersion,predictedAt);
  return {record:(await getPrediction(prediction.issue))!,inserted:Number(result.changes)===1};
}

export async function getPrediction(issue:string){
  if(hasNeonDatabase()){
    await ensureNeonSchema();
    const rows=await getNeonSql()`SELECT * FROM prediction_records WHERE target_issue=${issue}` as Row[];
    return rows[0]?fromRow(rows[0]):null;
  }
  const row=getDatabase().prepare("SELECT * FROM prediction_history WHERE issue=?").get(issue) as LegacyRow|undefined;
  return row?fromLegacy(row):null;
}

export async function getLatestPrediction(){
  if(hasNeonDatabase()){
    await ensureNeonSchema();
    const rows=await getNeonSql()`SELECT * FROM prediction_records ORDER BY target_issue::BIGINT DESC LIMIT 1` as Row[];
    return rows[0]?fromRow(rows[0]):null;
  }
  const row=getDatabase().prepare("SELECT * FROM prediction_history ORDER BY CAST(issue AS INTEGER) DESC LIMIT 1").get() as LegacyRow|undefined;
  return row?fromLegacy(row):null;
}

export async function getPredictionHistory(limit=20,offset=0){
  const take=Math.max(1,Math.min(100,Math.trunc(limit))),skip=Math.max(0,Math.trunc(offset));
  if(hasNeonDatabase()){
    await ensureNeonSchema();const db=getNeonSql();
    const [rows,counts]=await Promise.all([
      db`SELECT * FROM prediction_records ORDER BY target_issue::BIGINT DESC LIMIT ${take} OFFSET ${skip}`,
      db`SELECT COUNT(*)::integer AS count FROM prediction_records`,
    ]);
    return {records:(rows as unknown as Row[]).map(fromRow),total:Number((counts as unknown as Array<{count:number}>)[0]?.count??0)};
  }
  const db=getDatabase(),rows=db.prepare("SELECT * FROM prediction_history ORDER BY CAST(issue AS INTEGER) DESC LIMIT ? OFFSET ?").all(take,skip) as LegacyRow[];
  return {records:rows.map(fromLegacy),total:Number((db.prepare("SELECT COUNT(*) count FROM prediction_history").get() as {count:number}).count)};
}

export async function getCheckedPredictions(){
  if(hasNeonDatabase()){
    await ensureNeonSchema();
    return (await getNeonSql()`SELECT * FROM prediction_records WHERE status='settled' ORDER BY target_issue::BIGINT` as Row[]).map(fromRow);
  }
  return (getDatabase().prepare("SELECT * FROM prediction_history WHERE actual_sum IS NOT NULL ORDER BY CAST(issue AS INTEGER)").all() as LegacyRow[]).map(fromLegacy);
}

export async function reconcilePredictions(checkedAt=new Date().toISOString()):Promise<ReconciledPrediction[]>{
  if(hasNeonDatabase()){
    await ensureNeonSchema();
    const rows=await getNeonSql()`UPDATE prediction_records prediction SET
      actual_sum=draw.sum,is_hit=(prediction.recommended_sum=draw.sum),status='settled',
      settled_at=${checkedAt}::timestamptz,updated_at=${checkedAt}::timestamptz
      FROM draw_results draw WHERE draw.issue=prediction.target_issue AND prediction.status='pending'
      RETURNING prediction.target_issue,prediction.actual_sum,prediction.is_hit` as Array<{target_issue:string;actual_sum:number;is_hit:boolean}>;
    return rows.map(row=>({issue:row.target_issue,actualSum:row.actual_sum,hit:Boolean(row.is_hit),checkedAt}));
  }
  const db=getDatabase(),pending=db.prepare(`SELECT p.issue,draw.sum actual_sum,
    CASE WHEN p.recommended_sum=draw.sum THEN 1 ELSE 0 END hit FROM prediction_history p
    JOIN draw_records draw ON draw.issue=p.issue WHERE p.actual_sum IS NULL`).all() as Array<{issue:string;actual_sum:number;hit:number}>;
  const update=db.prepare("UPDATE prediction_history SET actual_sum=?,hit=?,checked_at=? WHERE issue=? AND actual_sum IS NULL"),done:ReconciledPrediction[]=[];
  db.exec("BEGIN");try{for(const row of pending)if(Number(update.run(row.actual_sum,row.hit,checkedAt,row.issue).changes)===1)done.push({issue:row.issue,actualSum:row.actual_sum,hit:Boolean(row.hit),checkedAt});db.exec("COMMIT");return done;}catch(error){db.exec("ROLLBACK");throw error;}
}

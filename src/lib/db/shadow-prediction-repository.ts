import type { V02ShadowPrediction } from "@/lib/prediction/v02-shadow";
import { ensureNeonSchema, getNeonSql, hasNeonDatabase } from "./neon";
import { getDatabase } from "./sqlite";

export type ShadowSaveResult = { inserted: boolean; targetIssue: string };
export type ShadowSettlement = { targetIssue: string; actualSum: number; hit: boolean };

export async function saveShadowPredictionOnce(
  prediction: V02ShadowPrediction,
  generatedAt = new Date().toISOString(),
): Promise<ShadowSaveResult> {
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const rows = await getNeonSql()`
      INSERT INTO prediction_shadow_records
        (target_issue,based_on_issue,model_version,recommended_sum,top3,top5,
         probability_distribution,confidence,diagnostics,sample_size,status,generated_at)
      VALUES(
        ${prediction.targetIssue},${prediction.basedOnIssue},${prediction.modelVersion},
        ${prediction.recommendedSum},${JSON.stringify(prediction.top3)}::jsonb,
        ${JSON.stringify(prediction.top5)}::jsonb,
        ${JSON.stringify(prediction.probabilityDistribution)}::jsonb,
        ${prediction.confidence},${JSON.stringify(prediction.diagnostics)}::jsonb,
        ${prediction.sampleSize},'pending',${generatedAt}::timestamptz
      )
      ON CONFLICT(target_issue,model_version) DO NOTHING
      RETURNING target_issue`;
    return { inserted: rows.length === 1, targetIssue: prediction.targetIssue };
  }

  const result = getDatabase().prepare(`
    INSERT INTO prediction_shadow_history
      (target_issue,based_on_issue,model_version,recommended_sum,top3_json,top5_json,
       probability_distribution_json,confidence,diagnostics_json,sample_size,status,generated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(target_issue,model_version) DO NOTHING
  `).run(
    prediction.targetIssue,
    prediction.basedOnIssue,
    prediction.modelVersion,
    prediction.recommendedSum,
    JSON.stringify(prediction.top3),
    JSON.stringify(prediction.top5),
    JSON.stringify(prediction.probabilityDistribution),
    prediction.confidence,
    JSON.stringify(prediction.diagnostics),
    prediction.sampleSize,
    "pending",
    generatedAt,
  );
  return { inserted: Number(result.changes) === 1, targetIssue: prediction.targetIssue };
}

export async function reconcileShadowPredictions(
  settledAt = new Date().toISOString(),
): Promise<ShadowSettlement[]> {
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const rows = await getNeonSql()`
      UPDATE prediction_shadow_records prediction SET
        actual_sum=draw.sum,
        is_hit=(prediction.recommended_sum=draw.sum),
        status='settled',
        settled_at=${settledAt}::timestamptz,
        updated_at=${settledAt}::timestamptz
      FROM draw_results draw
      WHERE draw.issue=prediction.target_issue AND prediction.status='pending'
      RETURNING prediction.target_issue,prediction.actual_sum,prediction.is_hit
    ` as Array<{ target_issue: string; actual_sum: number; is_hit: boolean }>;
    return rows.map((row) => ({
      targetIssue: row.target_issue,
      actualSum: row.actual_sum,
      hit: Boolean(row.is_hit),
    }));
  }

  const db = getDatabase();
  const rows = db.prepare(`
    SELECT prediction.target_issue,draw.sum AS actual_sum,
      CASE WHEN prediction.recommended_sum=draw.sum THEN 1 ELSE 0 END AS is_hit
    FROM prediction_shadow_history prediction
    JOIN draw_records draw ON draw.issue=prediction.target_issue
    WHERE prediction.status='pending'
  `).all() as Array<{ target_issue: string; actual_sum: number; is_hit: number }>;
  const update = db.prepare(`
    UPDATE prediction_shadow_history SET actual_sum=?,is_hit=?,status='settled',settled_at=?
    WHERE target_issue=? AND model_version='v0.2-candidate-b' AND status='pending'
  `);
  const settled: ShadowSettlement[] = [];
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      if (Number(update.run(row.actual_sum, row.is_hit, settledAt, row.target_issue).changes) === 1) {
        settled.push({
          targetIssue: row.target_issue,
          actualSum: row.actual_sum,
          hit: Boolean(row.is_hit),
        });
      }
    }
    db.exec("COMMIT");
    return settled;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function getShadowPredictionCount() {
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const rows = await getNeonSql()`
      SELECT COUNT(*)::integer AS count FROM prediction_shadow_records
      WHERE model_version='v0.2-candidate-b'`;
    return Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
  }
  const row = getDatabase().prepare(`
    SELECT COUNT(*) AS count FROM prediction_shadow_history
    WHERE model_version='v0.2-candidate-b'`).get() as { count: number };
  return Number(row.count);
}

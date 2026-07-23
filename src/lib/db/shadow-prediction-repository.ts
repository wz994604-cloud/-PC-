import type { V02ShadowPrediction } from "@/lib/prediction/v02-shadow";
import type { ConfidenceLabel, Prediction, ProbabilityPoint } from "@/lib/prediction/types";
import { ensureNeonSchema, getNeonSql, hasNeonDatabase } from "./neon";
import { getDatabase } from "./sqlite";

export type ShadowSaveResult = { inserted: boolean; targetIssue: string };
export type ShadowSettlement = { targetIssue: string; actualSum: number; hit: boolean };
export type ShadowPredictionRecord = Prediction & {
  basedOnIssue: string;
  top3: number[];
  top5: number[];
  status: "pending" | "settled";
  predictedAt: string;
  actualSum: number | null;
  hit: boolean | null;
  checkedAt: string | null;
  diagnostics: Record<string, unknown>;
};

type ShadowRow = {
  target_issue: string; based_on_issue: string; model_version: string; recommended_sum: number;
  top3: number[] | string; top5: number[] | string; probability_distribution: number[] | string;
  confidence: number; diagnostics: Record<string, unknown> | string; sample_size: number;
  status: "pending" | "settled"; generated_at: string; actual_sum: number | null;
  is_hit: boolean | number | null; settled_at: string | null;
};

const parse = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;
const theoreticalDistribution = (() => {
  const counts = Array<number>(28).fill(0);
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (let c = 0; c < 10; c++) counts[a + b + c]++;
  return counts.map((count) => count / 1000);
})();

function fromShadowRow(row: ShadowRow): ShadowPredictionRecord {
  const probabilities = parse(row.probability_distribution);
  const diagnostics = parse(row.diagnostics);
  const recent = Array.isArray(diagnostics.recentFrequency)
    ? diagnostics.recentFrequency as number[]
    : Array<number>(28).fill(0);
  const omissionRatios = Array.isArray(diagnostics.omissionRatios)
    ? diagnostics.omissionRatios as number[]
    : Array<number>(28).fill(0);
  const omissionTotal = omissionRatios.reduce((total, value) => total + value, 0);
  const distribution: ProbabilityPoint[] = probabilities.map((probability, sum) => ({
    sum,
    theoretical: theoreticalDistribution[sum] ?? 0,
    recentFrequency: recent[sum] ?? 0,
    omission: omissionTotal ? (omissionRatios[sum] ?? 0) / omissionTotal : 0,
    probability,
  }));
  const ranked = [...probabilities].sort((a, b) => b - a);
  const top = ranked[0] ?? 0;
  const margin = top - (ranked[1] ?? 0);
  const confidenceIndex = Math.max(1, Math.min(99,
    Math.round(45 + margin * 700 + Math.min(row.sample_size, 300) / 15)));
  const confidenceLabel: ConfidenceLabel = confidenceIndex >= 75 ? "较高" : confidenceIndex >= 55 ? "中等" : "低";
  return {
    issue: row.target_issue,
    basedOnIssue: row.based_on_issue,
    recommendedSum: row.recommended_sum,
    comprehensiveScore: Math.max(1, Math.min(100, Math.round(top * 1000))),
    confidenceIndex,
    confidenceLabel,
    risk: confidenceIndex >= 75 ? "较低" : confidenceIndex >= 55 ? "中等" : "较高",
    sampleSize: row.sample_size,
    weights: { theoretical: 0.2, recentFrequency: 0.45, omission: 0.1 },
    distribution,
    modelVersion: "v0.2-candidate-b",
    top3: parse(row.top3),
    top5: parse(row.top5),
    status: row.status,
    predictedAt: new Date(row.generated_at).toISOString(),
    actualSum: row.actual_sum,
    hit: row.is_hit === null ? null : Boolean(row.is_hit),
    checkedAt: row.settled_at ? new Date(row.settled_at).toISOString() : null,
    diagnostics,
  };
}

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

export async function getLatestShadowPrediction(): Promise<ShadowPredictionRecord | null> {
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const rows = await getNeonSql()`
      SELECT * FROM prediction_shadow_records
      WHERE model_version='v0.2-candidate-b'
      ORDER BY target_issue::BIGINT DESC LIMIT 1` as ShadowRow[];
    return rows[0] ? fromShadowRow(rows[0]) : null;
  }
  const row = getDatabase().prepare(`
    SELECT target_issue,based_on_issue,model_version,recommended_sum,top3_json AS top3,
      top5_json AS top5,probability_distribution_json AS probability_distribution,
      confidence,diagnostics_json AS diagnostics,sample_size,status,generated_at,
      actual_sum,is_hit,settled_at
    FROM prediction_shadow_history WHERE model_version='v0.2-candidate-b'
    ORDER BY CAST(target_issue AS INTEGER) DESC LIMIT 1`).get() as ShadowRow | undefined;
  return row ? fromShadowRow(row) : null;
}

export async function getShadowPredictionHistory(limit = 20, offset = 0) {
  const take = Math.max(1, Math.min(100, Math.trunc(limit)));
  const skip = Math.max(0, Math.trunc(offset));
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const db = getNeonSql();
    const [rows, counts] = await Promise.all([
      db`SELECT * FROM prediction_shadow_records WHERE model_version='v0.2-candidate-b'
        ORDER BY target_issue::BIGINT DESC LIMIT ${take} OFFSET ${skip}`,
      db`SELECT COUNT(*)::integer AS count FROM prediction_shadow_records
        WHERE model_version='v0.2-candidate-b'`,
    ]);
    return {
      records: (rows as unknown as ShadowRow[]).map(fromShadowRow),
      total: Number((counts as unknown as Array<{ count: number }>)[0]?.count ?? 0),
    };
  }
  const db = getDatabase();
  const selection = `SELECT target_issue,based_on_issue,model_version,recommended_sum,
    top3_json AS top3,top5_json AS top5,probability_distribution_json AS probability_distribution,
    confidence,diagnostics_json AS diagnostics,sample_size,status,generated_at,actual_sum,is_hit,settled_at
    FROM prediction_shadow_history WHERE model_version='v0.2-candidate-b'`;
  const rows = db.prepare(`${selection} ORDER BY CAST(target_issue AS INTEGER) DESC LIMIT ? OFFSET ?`)
    .all(take, skip) as ShadowRow[];
  const count = db.prepare(`SELECT COUNT(*) AS count FROM prediction_shadow_history
    WHERE model_version='v0.2-candidate-b'`).get() as { count: number };
  return { records: rows.map(fromShadowRow), total: Number(count.count) };
}

export async function getCheckedShadowPredictions(): Promise<ShadowPredictionRecord[]> {
  const { records } = await getShadowPredictionHistory(100, 0);
  return records.filter((record) => record.status === "settled");
}

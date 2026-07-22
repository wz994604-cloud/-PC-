import type { Draw } from "@/lib/draw/types";
import { getDatabase } from "./sqlite";

type DrawRow = {
  issue: string; number_1: number; number_2: number; number_3: number; sum: number;
  big_small: Draw["bigSmall"]; odd_even: Draw["oddEven"]; pattern: Draw["pattern"];
  open_time: string | null; raw_open_time: string | null;
};

const UPSERT = `INSERT OR IGNORE INTO draw_records
  (issue, number_1, number_2, number_3, sum, big_small, odd_even, pattern, open_time, raw_open_time, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function saveDraws(draws: Draw[]) {
  const db = getDatabase();
  const statement = db.prepare(UPSERT);
  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const draw of draws) {
      const result = statement.run(draw.issue, ...draw.numbers, draw.sum, draw.bigSmall, draw.oddEven, draw.pattern, draw.openTime, draw.rawOpenTime, new Date().toISOString());
      inserted += Number(result.changes);
    }
    db.exec("COMMIT");
    return inserted;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getDrawHistory(limit = 300): Draw[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.trunc(limit)));
  const rows = getDatabase().prepare(`SELECT issue, number_1, number_2, number_3, sum, big_small,
    odd_even, pattern, open_time, raw_open_time FROM draw_records ORDER BY CAST(issue AS INTEGER) DESC LIMIT ?`).all(safeLimit) as DrawRow[];
  return rows.map((row) => ({
    issue: row.issue,
    numbers: [row.number_1, row.number_2, row.number_3],
    sum: row.sum,
    bigSmall: row.big_small,
    oddEven: row.odd_even,
    pattern: row.pattern,
    openTime: row.open_time,
    rawOpenTime: row.raw_open_time,
  }));
}

import type { Draw } from "@/lib/draw/types";
import { ensureNeonSchema, getNeonSql, hasNeonDatabase } from "./neon";
import { getDatabase } from "./sqlite";

type DrawRow = {
  issue:string;num1:number;num2:number;num3:number;sum:number;
  big_small:Draw["bigSmall"];odd_even:Draw["oddEven"];pattern:Draw["pattern"];
  open_time:string|null;raw_data:{rawOpenTime?:string|null}|string|null;
};

export type DrawSyncResult = { inserted: number; duplicates: number };

function canonicalize(draw: Draw): Draw {
  if (!/^\d+$/.test(draw.issue)) throw new Error("Invalid draw issue");
  if (draw.numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) {
    throw new Error(`Invalid draw numbers for issue ${draw.issue}`);
  }
  const sum = draw.numbers[0] + draw.numbers[1] + draw.numbers[2];
  const openTime = draw.openTime && !Number.isNaN(Date.parse(draw.openTime))
    ? new Date(draw.openTime).toISOString()
    : null;
  return {
    ...draw,
    sum,
    bigSmall: sum <= 13 ? "小" : "大",
    oddEven: sum % 2 === 0 ? "双" : "单",
    openTime,
  };
}

export async function saveDrawsDetailed(draws: Draw[]): Promise<DrawSyncResult> {
  const valid = draws.map(canonicalize);
  if (!valid.length) return { inserted: 0, duplicates: 0 };
  if (hasNeonDatabase()) {
    await ensureNeonSchema();
    const now = new Date().toISOString();
    const rows = valid.map((draw) => ({
      issue:draw.issue,num1:draw.numbers[0],num2:draw.numbers[1],num3:draw.numbers[2],
      sum:draw.sum,big_small:draw.bigSmall,odd_even:draw.oddEven,pattern:draw.pattern,
      open_time:draw.openTime,raw_data:{rawOpenTime:draw.rawOpenTime},created_at:now,
    }));
    const inserted = await getNeonSql()`
      WITH entries AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS entry(
          issue text,num1 integer,num2 integer,num3 integer,sum integer,big_small text,
          odd_even text,pattern text,open_time text,raw_data jsonb,created_at text)
      ), repaired AS (
        UPDATE draw_results current SET
          open_time=COALESCE(current.open_time,entries.open_time::timestamptz),
          raw_data=COALESCE(current.raw_data,'{}'::jsonb)||COALESCE(entries.raw_data,'{}'::jsonb),
          updated_at=entries.created_at::timestamptz
        FROM entries
        WHERE current.issue=entries.issue
          AND (current.open_time IS NULL AND entries.open_time IS NOT NULL
            OR COALESCE(current.raw_data->>'rawOpenTime','')='')
        RETURNING current.issue
      )
      INSERT INTO draw_results
        (issue,num1,num2,num3,sum,big_small,odd_even,pattern,open_time,source,raw_data,created_at,updated_at)
      SELECT issue,num1,num2,num3,sum,big_small,odd_even,pattern,
        open_time::timestamptz,'jnd',raw_data,created_at::timestamptz,created_at::timestamptz
      FROM entries
      ON CONFLICT(issue) DO NOTHING RETURNING issue`;
    return { inserted: inserted.length, duplicates: valid.length - inserted.length };
  }
  const db=getDatabase(),statement=db.prepare(`INSERT OR IGNORE INTO draw_records
    (issue,number_1,number_2,number_3,sum,big_small,odd_even,pattern,open_time,raw_open_time,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
  let inserted=0;
  db.exec("BEGIN");
  try {
    for(const draw of valid) inserted+=Number(statement.run(draw.issue,...draw.numbers,draw.sum,draw.bigSmall,draw.oddEven,draw.pattern,draw.openTime,draw.rawOpenTime,new Date().toISOString()).changes);
    db.exec("COMMIT");
  } catch(error) { db.exec("ROLLBACK"); throw error; }
  return { inserted, duplicates:valid.length-inserted };
}

export async function saveDraws(draws: Draw[]) {
  return (await saveDrawsDetailed(draws)).inserted;
}

export async function getDrawHistory(limit=300):Promise<Draw[]> {
  const safe=Math.max(1,Math.min(1000,Math.trunc(limit)));
  if(hasNeonDatabase()) {
    await ensureNeonSchema();
    const rows=await getNeonSql()`SELECT issue,num1,num2,num3,sum,big_small,odd_even,pattern,
      open_time,raw_data FROM draw_results ORDER BY issue::BIGINT DESC LIMIT ${safe}` as DrawRow[];
    return rows.map(fromRow);
  }
  const rows=getDatabase().prepare(`SELECT issue,number_1 AS num1,number_2 AS num2,number_3 AS num3,
    sum,big_small,odd_even,pattern,open_time,json_object('rawOpenTime',raw_open_time) AS raw_data
    FROM draw_records ORDER BY CAST(issue AS INTEGER) DESC LIMIT ?`).all(safe) as DrawRow[];
  return rows.map(fromRow);
}

const fromRow=(row:DrawRow):Draw=>{
  const raw=typeof row.raw_data==="string"?JSON.parse(row.raw_data) as {rawOpenTime?:string|null}:row.raw_data;
  return {issue:row.issue,numbers:[row.num1,row.num2,row.num3],sum:row.sum,bigSmall:row.big_small,
    oddEven:row.odd_even,pattern:row.pattern,openTime:row.open_time?new Date(row.open_time).toISOString():null,
    rawOpenTime:raw?.rawOpenTime??null};
};

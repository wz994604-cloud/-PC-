import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;

function databasePath() {
  if (process.env.DATABASE_PATH === ":memory:") return ":memory:";
  return process.env.DATABASE_PATH ?? ".data/28live.sqlite";
}

export function getDatabase() {
  if (database) return database;
  const path = databasePath();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(database);
  return database;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS draw_records (
      issue TEXT PRIMARY KEY,
      number_1 INTEGER NOT NULL CHECK(number_1 BETWEEN 0 AND 9),
      number_2 INTEGER NOT NULL CHECK(number_2 BETWEEN 0 AND 9),
      number_3 INTEGER NOT NULL CHECK(number_3 BETWEEN 0 AND 9),
      sum INTEGER NOT NULL CHECK(sum BETWEEN 0 AND 27),
      big_small TEXT NOT NULL,
      odd_even TEXT NOT NULL,
      pattern TEXT NOT NULL,
      open_time TEXT,
      raw_open_time TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS draw_records_issue_desc ON draw_records(issue DESC);
    CREATE TABLE IF NOT EXISTS prediction_history (
      issue TEXT PRIMARY KEY,
      recommended_sum INTEGER NOT NULL CHECK(recommended_sum BETWEEN 0 AND 27),
      comprehensive_score INTEGER NOT NULL,
      confidence_index INTEGER NOT NULL,
      confidence_label TEXT NOT NULL,
      risk TEXT NOT NULL,
      sample_size INTEGER NOT NULL,
      weights_json TEXT NOT NULL,
      distribution_json TEXT NOT NULL,
      model_version TEXT NOT NULL,
      predicted_at TEXT NOT NULL,
      actual_sum INTEGER CHECK(actual_sum BETWEEN 0 AND 27),
      hit INTEGER CHECK(hit IN (0, 1)),
      checked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS prediction_history_issue_desc ON prediction_history(issue DESC);
  `);
}

export function closeDatabaseForTests() {
  database?.close();
  database = null;
}

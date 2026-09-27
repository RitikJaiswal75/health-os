import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

const DB_FILENAME = 'healthos-observability.db';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crash_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_crash_outbox_created ON crash_outbox(created_at);
`;

let instance: SQLiteDatabase | null = null;

export function setObservabilityDbForTests(database: SQLiteDatabase | null): void {
  instance = database;
}

export function getObservabilityDb(): SQLiteDatabase {
  if (instance) return instance;
  const db = SQLite.openDatabaseSync(DB_FILENAME);
  db.execSync(SCHEMA_SQL);
  instance = db;
  return db;
}

export function readObservabilityKv(key: string): string | null {
  const row = getObservabilityDb().getFirstSync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export function writeObservabilityKv(key: string, value: string): void {
  getObservabilityDb().runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}

// Real SQLite (better-sqlite3) behind the expo-sqlite sync API, with the app's migrations applied.
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_SQL } from '../../src/db/migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_002 } from '../../src/db/migrations/002_pill_color2';
import { MIGRATION_SQL as MIGRATION_003 } from '../../src/db/migrations/003_dose_unit';

export function createTestDb(): SQLiteDatabase {
  const raw = new Database(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  raw.exec(MIGRATION_SQL);
  raw.exec(MIGRATION_002);
  raw.exec(MIGRATION_003);
  return {
    execSync: (sql: string) => raw.exec(sql),
    runSync: (sql: string, params: unknown[] = []) => raw.prepare(sql).run(...params),
    getFirstSync: (sql: string, params: unknown[] = []) => raw.prepare(sql).get(...params) ?? null,
    getAllSync: (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...params),
    withTransactionSync: (task: () => void) => raw.transaction(task)(),
  } as unknown as SQLiteDatabase;
}

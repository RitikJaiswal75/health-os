import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_SQL } from '../src/db/migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_003 } from '../src/db/migrations/003_dose_unit';
import { runAddColumnMigration } from '../src/db/migrations/runAddColumnMigration';

describe('runAddColumnMigration', () => {
  it('finishes a migration whose first column was added before a crash', () => {
    const raw = new Database(':memory:');
    raw.exec(MIGRATION_SQL);
    raw.exec('ALTER TABLE medications ADD COLUMN dose_unit_value REAL;');
    const db = { execSync: (sql: string) => raw.exec(sql) } as unknown as SQLiteDatabase;

    runAddColumnMigration(db, MIGRATION_003);
    runAddColumnMigration(db, MIGRATION_003); // re-running on a finished DB is harmless

    const columns = raw.prepare('PRAGMA table_info(medications)').all() as { name: string }[];
    expect(columns.map((c) => c.name)).toEqual(
      expect.arrayContaining(['dose_unit_value', 'dose_unit_unit']),
    );
  });

  it('rethrows errors other than "duplicate column" (e.g. a full disk)', () => {
    const db = {
      execSync: () => {
        throw new Error('database or disk is full');
      },
    } as unknown as SQLiteDatabase;

    expect(() => runAddColumnMigration(db, MIGRATION_003)).toThrow('database or disk is full');
  });
});

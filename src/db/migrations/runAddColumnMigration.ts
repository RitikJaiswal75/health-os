import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Runs each ALTER TABLE ADD COLUMN on its own. One statement per try, so a crash between two
 * ALTERs can't make the second one fail forever behind the first's "duplicate column".
 */
export function runAddColumnMigration(db: SQLiteDatabase, sql: string): void {
  for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
    try {
      db.execSync(`${statement};`);
    } catch (error) {
      // Column already exists on upgraded databases; anything else (disk full) must surface.
      if (!/duplicate column/i.test(error instanceof Error ? error.message : String(error))) throw error;
    }
  }
}

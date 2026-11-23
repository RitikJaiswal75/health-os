import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Writes a consistent copy of the database, including anything still only in the WAL, and returns the
 * medication count (0 means nothing is copied). A WAL checkpoint cannot do this: it silently flushes
 * nothing when the app's own connection holds a lock, and the -wal file is not part of the backup.
 */
export function snapshotDatabase(
  db: Pick<SQLiteDatabase, 'execSync' | 'getFirstSync'>,
  targetPath: string,
): number {
  const count = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM medications')?.n ?? 0;
  if (count > 0) db.execSync(`VACUUM INTO '${targetPath.replace(/'/g, "''")}'`);
  return count;
}

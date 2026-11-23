import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import { snapshotDatabase } from '@/src/features/backup/databaseSnapshot';

jest.mock('@/src/features/backup/auth', () => ({
  BackupAuthError: class BackupAuthError extends Error {},
}));
jest.mock('expo-file-system/legacy', () => ({}));
/* eslint-disable import/first */
import { driveError } from '@/src/features/backup/driveClient';
import { BackupAuthError } from '@/src/features/backup/auth';
/* eslint-enable import/first */

/** The slice of the expo-sqlite sync API that snapshotDatabase uses, over better-sqlite3. */
function asExpoDb(raw: Database.Database): Pick<SQLiteDatabase, 'execSync' | 'getFirstSync'> {
  return {
    execSync: (sql: string) => raw.exec(sql),
    getFirstSync: (sql: string) => raw.prepare(sql).get() ?? null,
  } as Pick<SQLiteDatabase, 'execSync' | 'getFirstSync'>;
}

describe('snapshotDatabase', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'healthos-snap-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('keeps writes that are still only in the WAL while another connection holds a lock', () => {
    const dbFile = path.join(dir, 'health-os.db');
    const app = new Database(dbFile);
    app.pragma('journal_mode = WAL');
    app.exec('CREATE TABLE medications (id TEXT)');
    app.prepare('INSERT INTO medications VALUES (?)').run('old-dose');
    app.pragma('wal_checkpoint(TRUNCATE)');

    // A reader holds an older view of the database, then a new dose is written. A checkpoint cannot
    // move frames the reader still needs, so it reports busy and the new row stays only in the WAL.
    const reader = new Database(dbFile);
    reader.exec('BEGIN');
    reader.prepare('SELECT * FROM medications').all();
    app.prepare('INSERT INTO medications VALUES (?)').run('recent-dose');
    const other = new Database(dbFile);
    const checkpoint = other.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
    expect(checkpoint[0].busy).toBe(1);

    // What the old backup shipped: the main file alone. The newest row is not in it.
    const mainOnly = path.join(dir, 'main-only.db');
    copyFileSync(dbFile, mainOnly);
    const stale = new Database(mainOnly, { readonly: true });
    expect(stale.prepare('SELECT id FROM medications').all()).toEqual([{ id: 'old-dose' }]);
    stale.close();

    const target = path.join(dir, 'snapshot.db');
    expect(snapshotDatabase(asExpoDb(other), target)).toBe(2);
    const snap = new Database(target, { readonly: true });
    expect(snap.prepare('SELECT id FROM medications ORDER BY id').all()).toEqual([
      { id: 'old-dose' },
      { id: 'recent-dose' },
    ]);
    [app, reader, other, snap].forEach((db) => db.close());
  });

  it('writes nothing for an empty database', () => {
    const raw = new Database(path.join(dir, 'empty.db'));
    raw.exec('CREATE TABLE medications (id TEXT)');
    const target = path.join(dir, 'snapshot.db');
    expect(snapshotDatabase(asExpoDb(raw), target)).toBe(0);
    expect(() => new Database(target, { fileMustExist: true })).toThrow();
    raw.close();
  });
});

describe('driveError', () => {
  const reason = (r: string) => JSON.stringify({ error: { errors: [{ reason: r }] } });

  it('asks for a new sign-in only for real authorization failures', () => {
    expect(driveError(401, '')).toBeInstanceOf(BackupAuthError);
    expect(driveError(403, reason('authError'))).toBeInstanceOf(BackupAuthError);
    expect(driveError(403, reason('insufficientPermissions'))).toBeInstanceOf(BackupAuthError);
  });

  it('does not treat a full Drive or a rate limit as a sign-in problem', () => {
    const full = driveError(403, reason('storageQuotaExceeded'));
    expect(full).not.toBeInstanceOf(BackupAuthError);
    expect(full.message).toMatch(/full/);
    expect(driveError(403, reason('userRateLimitExceeded'))).not.toBeInstanceOf(BackupAuthError);
    expect(driveError(403, 'not json')).not.toBeInstanceOf(BackupAuthError);
    expect(driveError(500, '')).not.toBeInstanceOf(BackupAuthError);
  });
});

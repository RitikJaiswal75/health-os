import { CrashOutbox } from '../../src/core/observability/outbox';
import type { CrashEvent } from '../../src/core/observability/types';
import type { SQLiteDatabase } from 'expo-sqlite';

const event: CrashEvent = {
  installId: 'install-1',
  appVersion: '2.0.1',
  osVersion: '14',
  deviceModel: 'Pixel',
  routeName: '/(tabs)',
  errorCode: 'DOSE_MARK_FAILED',
  errorName: 'Error',
  stackFrames: ['at markDoseAsTaken'],
  message: null,
  level: 'error',
};

type Row = { id: string; payload: string; created_at: string; attempts: number };

function createMemoryDb() {
  let rows: Row[] = [];

  const db = {
    execSync: jest.fn(),
    closeSync: jest.fn(),
    getAllSync: jest.fn((sql: string) => {
      if (sql.includes('FROM crash_outbox')) {
        return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      }
      return [];
    }),
    getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('COUNT(*)')) {
        if (sql.includes('created_at <')) {
          const cutoff = String(params?.[0] ?? '');
          return { count: rows.filter((row) => row.created_at < cutoff).length };
        }
        return { count: rows.length };
      }
      if (sql.includes('ORDER BY created_at ASC LIMIT 1')) {
        const oldest = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
        return oldest ? { id: oldest.id } : null;
      }
      return null;
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT')) {
        rows = [
          ...rows,
          {
            id: String(params?.[0]),
            payload: String(params?.[1]),
            created_at: String(params?.[2]),
            attempts: 0,
          },
        ];
        return;
      }
      if (sql.includes('DELETE FROM crash_outbox WHERE id = ?') && params?.[0]) {
        rows = rows.filter((row) => row.id !== params[0]);
        return;
      }
      if (sql.includes('DELETE FROM crash_outbox WHERE created_at <')) {
        const cutoff = String(params?.[0] ?? '');
        rows = rows.filter((row) => row.created_at >= cutoff);
        return;
      }
      if (sql.includes('UPDATE crash_outbox SET attempts')) {
        rows = rows.map((row) =>
          row.id === params?.[1] ? { ...row, attempts: Number(params[0]) } : row,
        );
      }
    }),
  };

  return { db: db as unknown as SQLiteDatabase, rows: () => rows };
}

describe('CrashOutbox', () => {
  it('enqueues and lists events', () => {
    const { db } = createMemoryDb();
    const outbox = new CrashOutbox(db);
    outbox.enqueue(event);
    const pending = outbox.list(10);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.event.errorCode).toBe('DOSE_MARK_FAILED');
  });

  it('drops the oldest event when over the cap', () => {
    const { db, rows } = createMemoryDb();
    const outbox = new CrashOutbox(db);
    for (let i = 0; i < 51; i += 1) {
      outbox.enqueue({ ...event, errorCode: `DOSE_MARK_FAILED` });
    }
    expect(rows().length).toBe(50);
  });

  it('removes a delivered event', () => {
    const { db } = createMemoryDb();
    const outbox = new CrashOutbox(db);
    outbox.enqueue(event);
    const [row] = outbox.list(1);
    if (!row) throw new Error('expected row');
    outbox.remove(row.id);
    expect(outbox.list(10)).toHaveLength(0);
  });
});

import { v4 as uuidv4 } from 'uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getObservabilityDb } from './observabilityDb';
import type { CrashEvent } from './types';

export const OUTBOX_MAX_ITEMS = 50;
const OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface OutboxRow {
  id: string;
  event: CrashEvent;
  createdAt: string;
  attempts: number;
}

export class CrashOutbox {
  constructor(private readonly db: SQLiteDatabase) {}

  enqueue(event: CrashEvent): void {
    this.sweepExpired();
    while (this.count() >= OUTBOX_MAX_ITEMS) {
      const oldest = this.db.getFirstSync<{ id: string }>(
        'SELECT id FROM crash_outbox ORDER BY created_at ASC LIMIT 1',
      );
      if (!oldest) break;
      this.remove(oldest.id);
    }
    this.db.runSync(
      `INSERT INTO crash_outbox (id, payload, created_at, attempts) VALUES (?, ?, ?, 0)`,
      [uuidv4(), JSON.stringify(event), new Date().toISOString()],
    );
  }

  list(limit: number): OutboxRow[] {
    const rows = this.db.getAllSync<{
      id: string;
      payload: string;
      created_at: string;
      attempts: number;
    }>(
      `SELECT id, payload, created_at, attempts FROM crash_outbox ORDER BY created_at ASC LIMIT ?`,
      [limit],
    );
    return rows.flatMap((row) => {
      try {
        const event = JSON.parse(row.payload) as CrashEvent;
        return [{ id: row.id, event, createdAt: row.created_at, attempts: row.attempts }];
      } catch {
        this.remove(row.id);
        return [];
      }
    });
  }

  remove(id: string): void {
    this.db.runSync('DELETE FROM crash_outbox WHERE id = ?', [id]);
  }

  incrementAttempts(id: string): void {
    this.db.runSync('UPDATE crash_outbox SET attempts = attempts + 1 WHERE id = ?', [id]);
  }

  sweepExpired(): number {
    const cutoff = new Date(Date.now() - OUTBOX_MAX_AGE_MS).toISOString();
    const before = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM crash_outbox WHERE created_at < ?',
      [cutoff],
    );
    this.db.runSync('DELETE FROM crash_outbox WHERE created_at < ?', [cutoff]);
    return before?.count ?? 0;
  }

  count(): number {
    const row = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM crash_outbox',
    );
    return row?.count ?? 0;
  }
}

export function getCrashOutbox(): CrashOutbox {
  return new CrashOutbox(getObservabilityDb());
}

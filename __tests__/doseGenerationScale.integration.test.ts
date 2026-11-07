// Real SQLite: dose generation must not redo work per planned dose as history grows.
import { addDays, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import { createTestDb } from './helpers/sqliteDb';
import { MedicationRepository } from '../src/features/medications/medicationRepository';
import { generateUpcomingDoseEvents } from '../src/features/medications/doseGenerationService';

jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

const HOURS = [8, 14, 20];

function createMedication(db: SQLiteDatabase, name: string) {
  return new MedicationRepository(db).create({
    name,
    medicationType: 'tablet',
    currentQuantity: 100,
    schedule: {
      type: 'fixed_daily',
      timesOfDay: HOURS.map((hour) => ({ hour, minute: 0, doseAmount: 1 })),
      startDate: '2023-09-01',
    },
  });
}

function insertDose(db: SQLiteDatabase, medId: string, scheduleId: string, at: string, status: string, notes: string | null = null) {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO dose_events (id, medication_id, schedule_id, scheduled_at, status, dose_amount, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [uuidv4(), medId, scheduleId, at, status, notes, now, now],
  );
}

function rowsAt(db: SQLiteDatabase, at: string) {
  return db.getAllSync<{ status: string }>(`SELECT status FROM dose_events WHERE scheduled_at = ?`, [at]);
}

describe('generateUpcomingDoseEvents', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.setSystemTime(new Date('2026-09-13T06:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('does not recreate a slot that is taken, or that was snoozed away', () => {
    const db = createTestDb();
    const { medication, schedule } = createMedication(db, 'Metformin');
    insertDose(db, medication.id, schedule.id, '2026-09-14T08:00:00', 'taken');
    insertDose(db, medication.id, schedule.id, '2026-09-14T14:30:00', 'snoozed', 'snoozedFrom:2026-09-14T14:00:00');

    generateUpcomingDoseEvents(db, 2);

    expect(rowsAt(db, '2026-09-14T08:00:00').map((row) => row.status)).toEqual(['taken']);
    expect(rowsAt(db, '2026-09-14T14:00:00')).toEqual([]);
    expect(rowsAt(db, '2026-09-14T20:00:00').map((row) => row.status)).toEqual(['pending']);
  });

  it('stays fast with three years of history for several medicines', () => {
    const db = createTestDb();
    const start = new Date(2023, 8, 13);
    db.withTransactionSync(() => {
      for (const name of ['A', 'B', 'C', 'D']) {
        const { medication, schedule } = createMedication(db, name);
        for (let day = 0; day < 1095; day += 1) {
          const key = format(addDays(start, day), 'yyyy-MM-dd');
          for (const hour of HOURS) {
            insertDose(db, medication.id, schedule.id, `${key}T${String(hour).padStart(2, '0')}:00:00`, 'taken');
          }
        }
      }
    });

    const started = performance.now();
    generateUpcomingDoseEvents(db, 14);
    const elapsedMs = performance.now() - started;

    // About 13,000 rows. Re-reading every row for every planned dose took several seconds.
    expect(elapsedMs).toBeLessThan(1500);
  });
});

// Real SQLite + real repositories: marking, editing and deleting doses must keep stock right.
import type { SQLiteDatabase } from 'expo-sqlite';
import { createTestDb } from './helpers/sqliteDb';
import {
  DoseEventRepository,
  MedicationRepository,
} from '../src/features/medications/medicationRepository';
import {
  createMedicationAndBackfill,
  generateUpcomingDoseEvents,
} from '../src/features/medications/doseGenerationService';
import {
  deleteDose,
  markDoseAsTaken,
  saveDoseEdit,
} from '../src/features/inventory/doseTakenService';
import { notifyRefillIfNeeded } from '../src/features/inventory/refillReminderService';
import { ReminderReconciler } from '../src/features/reminders/reminderService';

// The real ReminderReconciler (DB -> alarms) without the notification plumbing around it.
jest.mock('expo-notifications', () => ({}));
jest.mock('../src/features/reminders/notificationSetup', () => ({}));
jest.mock('../src/features/reminders/reminderService', () => ({
  ...jest.requireActual('../src/features/reminders/reminderService'),
  rescheduleReminders: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/features/inventory/refillReminderService', () => ({
  notifyRefillIfNeeded: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

/** A tablet taken 2 at a time at 08:00, with `quantity` left; returns today's dose. */
function setUp(quantity: number) {
  const db = createTestDb();
  const { medication } = createMedicationAndBackfill(db, {
    name: 'Metformin',
    medicationType: 'tablet',
    currentQuantity: quantity,
    schedule: {
      type: 'fixed_daily',
      timesOfDay: [{ hour: 8, minute: 0, doseAmount: 2 }],
      startDate: '2026-09-13',
    },
  });
  generateUpcomingDoseEvents(db, 1);
  const doseRepo = new DoseEventRepository(db);
  const row = db.getFirstSync<{ id: string }>(
    `SELECT id FROM dose_events WHERE medication_id = ? ORDER BY scheduled_at LIMIT 1`,
    [medication.id],
  );
  return { db, doseRepo, medId: medication.id, doseId: row!.id };
}

function stock(db: SQLiteDatabase, medId: string): number {
  return new MedicationRepository(db).getById(medId)!.currentQuantity ?? NaN;
}

describe('dose writes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-13T10:00:00'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('undoing a dose that emptied the stock restores only what was removed', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    markDoseAsTaken(db, doseId);
    expect(stock(db, medId)).toBe(0);

    saveDoseEdit(db, doseRepo.getById(doseId)!, 'skipped');
    expect(stock(db, medId)).toBe(1);
  });

  it('deleting a taken dose that emptied the stock restores only what was removed', () => {
    const { db, doseRepo, medId, doseId } = setUp(1);
    markDoseAsTaken(db, doseId);

    deleteDose(db, doseRepo.getById(doseId)!);
    expect(stock(db, medId)).toBe(1);
  });

  it('marking Taken through an edit sends the refill check, like the Home Taken button', () => {
    const { db, doseRepo, doseId } = setUp(10);
    saveDoseEdit(db, doseRepo.getById(doseId)!, 'taken');

    expect(doseRepo.getById(doseId)!.status).toBe('taken');
    expect(notifyRefillIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('leaves stock untouched when saving the taken status fails', () => {
    const { db, doseRepo, medId, doseId } = setUp(10);
    jest.spyOn(DoseEventRepository.prototype, 'updateStatus').mockImplementationOnce(() => {
      throw new Error('disk I/O error');
    });

    expect(markDoseAsTaken(db, doseId)).toBe(false);
    expect(stock(db, medId)).toBe(10);
    expect(doseRepo.getById(doseId)!.status).toBe('pending');

    // The retry deducts exactly once.
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(stock(db, medId)).toBe(8);
  });

  it('reports an already-taken dose as logged, so the alarm screen can close', () => {
    const { db, medId, doseId } = setUp(10);
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(markDoseAsTaken(db, doseId)).toBe(true);
    expect(stock(db, medId)).toBe(8);
  });

  it('a snoozed dose still gets an alarm at its new time', () => {
    const { db, doseRepo, doseId } = setUp(10);
    jest.setSystemTime(new Date('2026-09-13T07:55:00'));
    doseRepo.snooze(doseId, '2026-09-13T08:15:00', '2026-09-13T08:00:00');

    const alarms = new ReminderReconciler(db).reconcile(7);
    expect(alarms.find((alarm) => alarm.doseEventId === doseId)?.scheduledAt).toBe('2026-09-13T08:15:00');
  });

  it('keeps a medication whole when deleting it fails part way', () => {
    const { db, medId } = setUp(10);
    const runSync = db.runSync.bind(db);
    jest.spyOn(db, 'runSync').mockImplementation(((sql: string, params: unknown[]) => {
      if (sql.startsWith('DELETE FROM medications')) throw new Error('disk I/O error');
      return runSync(sql, params as never);
    }) as typeof db.runSync);

    expect(() => new MedicationRepository(db).delete(medId)).toThrow('disk I/O error');
    const doses = db.getAllSync(`SELECT id FROM dose_events WHERE medication_id = ?`, [medId]);
    expect(doses.length).toBeGreaterThan(0);
  });

  it('leaves no half-saved medication when creating it fails part way', () => {
    const db = createTestDb();
    const runSync = db.runSync.bind(db);
    jest.spyOn(db, 'runSync').mockImplementation(((sql: string, params: unknown[]) => {
      if (sql.startsWith('INSERT INTO schedules')) throw new Error('disk I/O error');
      return runSync(sql, params as never);
    }) as typeof db.runSync);

    expect(() =>
      new MedicationRepository(db).create({
        name: 'Metformin',
        medicationType: 'tablet',
        currentQuantity: 10,
        schedule: { type: 'fixed_daily', timesOfDay: [{ hour: 8, minute: 0 }], startDate: '2026-09-13' },
      }),
    ).toThrow('disk I/O error');
    expect(new MedicationRepository(db).getAll()).toHaveLength(0);
  });
});

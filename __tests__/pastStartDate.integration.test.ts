// Real SQLite (better-sqlite3 behind the expo-sqlite sync API) + the real repositories, so the
// whole path "save a medication with a past start date -> Home / History see it" is exercised.
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_SQL } from '../src/db/migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_002 } from '../src/db/migrations/002_pill_color2';
import { MIGRATION_SQL as MIGRATION_003 } from '../src/db/migrations/003_dose_unit';
import {
  DoseEventRepository,
  MedicationRepository,
  type CreateMedicationInput,
} from '../src/features/medications/medicationRepository';
import {
  createMedicationAndBackfill,
  generateUpcomingDoseEvents,
  repairMissingPastDosesOnce,
  updateMedicationAndBackfill,
} from '../src/features/medications/doseGenerationService';

function createDb(): SQLiteDatabase {
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

function medicationStartingOn(startDate: string): CreateMedicationInput {
  return {
    name: 'Metformin',
    medicationType: 'tablet',
    currentQuantity: 30,
    schedule: {
      type: 'fixed_daily',
      timesOfDay: [{ hour: 8, minute: 0, doseAmount: 1 }],
      startDate,
    },
  };
}

describe('medication with a past start date', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-13T10:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('adding one shows the past days in History and Home, as missed', () => {
    const db = createDb();
    createMedicationAndBackfill(db, medicationStartingOn('2026-09-10'));
    generateUpcomingDoseEvents(db, 14);

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getEarliestHistoryDateKey()).toBe('2026-09-10');
    for (const day of ['2026-09-10', '2026-09-11', '2026-09-12']) {
      expect(doseRepo.getForDate(day).map((dose) => dose.status)).toEqual(['missed']);
    }
  });

  it('editing the start date earlier shows the newly covered days', () => {
    const db = createDb();
    const { medication } = createMedicationAndBackfill(db, medicationStartingOn('2026-09-13'));
    generateUpcomingDoseEvents(db, 14);

    expect(updateMedicationAndBackfill(db, medication.id, medicationStartingOn('2026-09-10'))).toBe(true);
    generateUpcomingDoseEvents(db, 14);

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getEarliestHistoryDateKey()).toBe('2026-09-10');
    expect(doseRepo.getForDate('2026-09-11')).toHaveLength(1);
  });

  it('saving again without moving the start earlier does not bring back a deleted dose', () => {
    const db = createDb();
    const { medication } = createMedicationAndBackfill(db, medicationStartingOn('2026-09-10'));
    const doseRepo = new DoseEventRepository(db);
    const [deleted] = doseRepo.getForDate('2026-09-11');
    doseRepo.delete(deleted!.id);

    updateMedicationAndBackfill(db, medication.id, medicationStartingOn('2026-09-10'));
    generateUpcomingDoseEvents(db, 14);

    expect(doseRepo.getForDate('2026-09-11')).toEqual([]);
  });

  it('a start date far back only fills the last 15 days', () => {
    const db = createDb();
    createMedicationAndBackfill(db, medicationStartingOn('2025-09-13'));

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getEarliestHistoryDateKey()).toBe('2026-08-29');
    expect(doseRepo.getForDate('2026-08-28')).toEqual([]);
    expect(doseRepo.getForDate('2026-08-29')).toHaveLength(1);
  });

  it('an edit fills only the days before the first recorded day, like the startup repair', () => {
    const db = createDb();
    jest.setSystemTime(new Date('2026-09-08T10:00:00'));
    const { medication } = createMedicationAndBackfill(db, medicationStartingOn('2026-09-05'));
    generateUpcomingDoseEvents(db, 14); // rows from 09-08 on
    jest.setSystemTime(new Date('2026-09-13T10:00:00')); // app not opened 09-09 .. 09-12

    updateMedicationAndBackfill(db, medication.id, medicationStartingOn('2026-09-01'));

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getForDate('2026-09-02')).toHaveLength(1);
    expect(doseRepo.getForDate('2026-09-10').map((dose) => dose.status)).toEqual(['pending']);
  });

  it('regular generation only looks forward, so it never recreates past days', () => {
    const db = createDb();
    new MedicationRepository(db).create(medicationStartingOn('2026-09-10'));
    generateUpcomingDoseEvents(db, 14);

    expect(new DoseEventRepository(db).getForDate('2026-09-11')).toEqual([]);
  });

  it('does not add a second dose to a past day that already has one after a time change', () => {
    const db = createDb();
    const { medication } = createMedicationAndBackfill(db, medicationStartingOn('2026-09-10'));

    const later = medicationStartingOn('2026-09-08');
    later.schedule.timesOfDay = [{ hour: 9, minute: 0, doseAmount: 1 }];
    updateMedicationAndBackfill(db, medication.id, later);

    const doseRepo = new DoseEventRepository(db);
    for (const day of ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']) {
      expect(doseRepo.getForDate(day)).toHaveLength(1);
    }
  });
});

describe('one-time repair for medications saved before past start dates were supported', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-13T10:00:00'));
  });
  afterEach(() => jest.useRealTimers());

  it('fills the days between the start date and the first recorded day, once', () => {
    const db = createDb();
    // What an older build left behind: a past start date but dose rows only from today on.
    new MedicationRepository(db).create(medicationStartingOn('2026-09-10'));
    generateUpcomingDoseEvents(db, 14);

    repairMissingPastDosesOnce(db);

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getEarliestHistoryDateKey()).toBe('2026-09-10');
    expect(doseRepo.getForDate('2026-09-11').map((dose) => dose.status)).toEqual(['missed']);

    // Deleting a repaired dose and starting the app again must not bring it back.
    doseRepo.delete(doseRepo.getForDate('2026-09-11')[0]!.id);
    repairMissingPastDosesOnce(db);
    expect(doseRepo.getForDate('2026-09-11')).toEqual([]);
  });

  it('leaves days the app simply was not opened on alone', () => {
    const db = createDb();
    jest.setSystemTime(new Date('2026-09-08T10:00:00'));
    new MedicationRepository(db).create(medicationStartingOn('2026-09-05'));
    generateUpcomingDoseEvents(db, 14); // rows from 09-08 on
    jest.setSystemTime(new Date('2026-09-13T10:00:00')); // app not opened 09-09 .. 09-12

    repairMissingPastDosesOnce(db);

    const doseRepo = new DoseEventRepository(db);
    expect(doseRepo.getForDate('2026-09-06')).toHaveLength(1); // before the first recorded day
    expect(doseRepo.getForDate('2026-09-10').map((dose) => dose.status)).toEqual(['pending']);
  });
});

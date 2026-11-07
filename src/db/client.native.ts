import * as SQLite from 'expo-sqlite';
import { MIGRATION_SQL } from './migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_002 } from './migrations/002_pill_color2';
import { MIGRATION_SQL as MIGRATION_003 } from './migrations/003_dose_unit';
import { runAddColumnMigration } from './migrations/runAddColumnMigration';
import {
  resolveHealthOsDirectory,
  DB_FILENAME,
} from '../core/storage/durableStorage';
import type { DbBootstrapResult } from './clientTypes';
import { CatalogCacheRepository } from '../features/catalog/catalogService';
import {
  generateUpcomingDoseEvents,
  repairMissingPastDosesOnce,
} from '../features/medications/doseGenerationService';
import { ReminderReconciler, scheduleAlarms } from '../features/reminders/reminderService';
import { reportError } from '../core/observability/crashReporter';

export type { DbBootstrapResult, SQLiteDatabase } from './clientTypes';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let bootstrapError: string | null = null;

export async function bootstrapDatabase(): Promise<DbBootstrapResult> {
  if (dbInstance) {
    return { status: 'ready', db: dbInstance };
  }
  if (bootstrapError) {
    return { status: 'error', message: bootstrapError };
  }

  try {
    const directory = await resolveHealthOsDirectory();

    const db = SQLite.openDatabaseSync(
      DB_FILENAME,
      { enableChangeListener: true },
      directory,
    );

    db.execSync('PRAGMA foreign_keys = ON;');
    db.execSync(MIGRATION_SQL);

    runAddColumnMigration(db, MIGRATION_002);
    runAddColumnMigration(db, MIGRATION_003);

    db.runSync(
      `INSERT OR IGNORE INTO reminder_health (id, updated_at) VALUES ('singleton', ?)`,
      [new Date().toISOString()],
    );

    new CatalogCacheRepository(db).sweepExpired();
    // Dose generation and alarms are best effort: if they fail the user must still see their data.
    try {
      generateUpcomingDoseEvents(db, 14);
    } catch (error) {
      reportError('DB_BOOTSTRAP_FAILED', error);
    }
    try {
      repairMissingPastDosesOnce(db);
    } catch {
      // Best effort: a failed repair must never block startup. The flag stays unset, so it retries.
    }

    try {
      await scheduleAlarms(new ReminderReconciler(db).reconcile(7));
    } catch (error) {
      reportError('ALARM_SCHEDULE_FAILED', error);
    }

    dbInstance = db;
    return { status: 'ready', db };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database initialization failed';
    bootstrapError = message;
    return { status: 'error', message };
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call bootstrapDatabase first.');
  }
  return dbInstance;
}

export function resetDatabaseForTests(): void {
  if (dbInstance) {
    try {
      dbInstance.closeSync();
    } catch {
      // ignore
    }
  }
  dbInstance = null;
  bootstrapError = null;
}

export async function retryBootstrap(): Promise<DbBootstrapResult> {
  bootstrapError = null;
  dbInstance = null;
  return bootstrapDatabase();
}

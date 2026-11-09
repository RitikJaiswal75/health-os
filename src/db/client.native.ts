import * as SQLite from 'expo-sqlite';
import { MIGRATION_SQL } from './migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_002 } from './migrations/002_pill_color2';
import { MIGRATION_SQL as MIGRATION_003 } from './migrations/003_dose_unit';
import { runAddColumnMigration } from './migrations/runAddColumnMigration';
import {
  adoptLegacyPublicData,
  resolveHealthOsDirectory,
  rewriteLegacyPhotoPaths,
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
let pendingBootstrap: Promise<DbBootstrapResult> | null = null;

export function bootstrapDatabase(): Promise<DbBootstrapResult> {
  if (dbInstance) {
    return Promise.resolve({ status: 'ready', db: dbInstance });
  }
  if (bootstrapError) {
    return Promise.resolve({ status: 'error', message: bootstrapError });
  }
  // Callers during setup share one run, or each would copy the data and open the database again.
  pendingBootstrap ??= runBootstrap().finally(() => {
    pendingBootstrap = null;
  });
  return pendingBootstrap;
}

async function runBootstrap(): Promise<DbBootstrapResult> {
  try {
    const directory = await resolveHealthOsDirectory();
    await adoptLegacyPublicData(directory);

    const db = SQLite.openDatabaseSync(
      DB_FILENAME,
      { enableChangeListener: true },
      directory,
    );

    db.execSync('PRAGMA foreign_keys = ON;');
    db.execSync(MIGRATION_SQL);

    runAddColumnMigration(db, MIGRATION_002);
    runAddColumnMigration(db, MIGRATION_003);

    // Photos moved with the database. Every launch, not only the one that copied: a launch killed
    // after the copy would otherwise leave the paths pointing at the public originals.
    rewriteLegacyPhotoPaths(db, directory);

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
  pendingBootstrap = null;
}

export async function retryBootstrap(): Promise<DbBootstrapResult> {
  bootstrapError = null;
  dbInstance = null;
  return bootstrapDatabase();
}

import * as SQLite from 'expo-sqlite';
import { MIGRATION_SQL } from './migrations/001_initial';
import { MIGRATION_SQL as MIGRATION_002 } from './migrations/002_pill_color2';
import { MIGRATION_SQL as MIGRATION_003 } from './migrations/003_dose_unit';
import {
  resolveHealthOsDirectory,
  DB_FILENAME,
} from '../core/storage/durableStorage';
import type { DbBootstrapResult } from './clientTypes';
import { CatalogCacheRepository } from '../features/catalog/catalogService';
import { generateUpcomingDoseEvents } from '../features/medications/doseGenerationService';
import { ReminderReconciler, scheduleAlarms } from '../features/reminders/reminderService';

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

    try {
      db.execSync(MIGRATION_002);
    } catch {
      // Column may already exist on upgraded databases.
    }

    try {
      db.execSync(MIGRATION_003);
    } catch {
      // Columns may already exist on upgraded databases.
    }

    db.runSync(
      `INSERT OR IGNORE INTO reminder_health (id, updated_at) VALUES ('singleton', ?)`,
      [new Date().toISOString()],
    );

    new CatalogCacheRepository(db).sweepExpired();
    generateUpcomingDoseEvents(db, 14);

    const reconciler = new ReminderReconciler(db);
    await scheduleAlarms(reconciler.reconcile(7));

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

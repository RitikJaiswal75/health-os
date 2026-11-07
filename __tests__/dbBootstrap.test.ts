import { bootstrapDatabase, resetDatabaseForTests } from '../src/db/client.native';
import { generateUpcomingDoseEvents } from '../src/features/medications/doseGenerationService';
import { scheduleAlarms } from '../src/features/reminders/reminderService';
import { reportError } from '../src/core/observability/crashReporter';
import { openDatabaseSync } from 'expo-sqlite';
import { rewriteLegacyPhotoPaths } from '../src/core/storage/durableStorage';
import { createTestDb } from './helpers/sqliteDb';

jest.mock('../src/core/storage/durableStorage', () => ({
  DB_FILENAME: 'health-os.db',
  resolveHealthOsDirectory: jest.fn(() => Promise.resolve('file:///data/HealthOS/')),
  adoptLegacyPublicData: jest.fn(() => Promise.resolve()),
  rewriteLegacyPhotoPaths: jest.fn(),
}));
jest.mock('../src/features/catalog/catalogService', () => ({
  CatalogCacheRepository: jest.fn(() => ({ sweepExpired: jest.fn() })),
}));
jest.mock('../src/features/medications/doseGenerationService', () => ({
  generateUpcomingDoseEvents: jest.fn(),
  repairMissingPastDosesOnce: jest.fn(),
}));
jest.mock('../src/features/reminders/reminderService', () => ({
  ReminderReconciler: jest.fn(() => ({ reconcile: () => [] })),
  scheduleAlarms: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

describe('bootstrapDatabase', () => {
  afterEach(() => {
    resetDatabaseForTests();
    jest.clearAllMocks();
  });

  it('opens the database even when generating upcoming doses fails', async () => {
    (generateUpcomingDoseEvents as jest.Mock).mockImplementationOnce(() => {
      throw new RangeError('Invalid time value');
    });

    await expect(bootstrapDatabase()).resolves.toMatchObject({ status: 'ready' });
    expect(reportError).toHaveBeenCalledWith('DB_BOOTSTRAP_FAILED', expect.any(RangeError));
  });

  it('opens the database even when scheduling alarms fails', async () => {
    (scheduleAlarms as jest.Mock).mockRejectedValueOnce(new Error('alarm module missing'));

    await expect(bootstrapDatabase()).resolves.toMatchObject({ status: 'ready' });
    expect(reportError).toHaveBeenCalledWith('ALARM_SCHEDULE_FAILED', expect.any(Error));
  });

  it('repairs photo paths on every launch, even when this launch copied nothing', async () => {
    const db = createTestDb();
    (openDatabaseSync as jest.Mock).mockReturnValueOnce(db);
    // adoptLegacyPublicData resolves with nothing: the copy happened on an earlier launch.

    await expect(bootstrapDatabase()).resolves.toMatchObject({ status: 'ready' });
    expect(rewriteLegacyPhotoPaths).toHaveBeenCalledWith(db, 'file:///data/HealthOS/');
  });
});

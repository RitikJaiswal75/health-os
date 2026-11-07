// Data must live in app-private storage: a reinstalled app can't open files an earlier install
// left in public Documents (Android 11+), which used to strand users on the error screen.
const PRIVATE_ROOT = 'file:///data/user/0/com.health.os/files/';
const PUBLIC_DIR = '/storage/emulated/0/Documents/HealthOS/';
const PRIVATE_DIR = `${PRIVATE_ROOT}HealthOS/`;

const files = new Map<string, string>();
let unreadable = false;

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: PRIVATE_ROOT,
  getInfoAsync: jest.fn(async (path: string) => ({
    exists: [...files.keys()].some((key) => key === path || key.startsWith(path)),
  })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    if (unreadable && from.startsWith(PUBLIC_DIR)) throw new Error('EACCES (Permission denied)');
    for (const [key, value] of [...files]) {
      if (key === from) files.set(to, value);
      else if (key.startsWith(`${from}/`)) files.set(to + key.slice(from.length), value);
    }
  }),
  deleteAsync: jest.fn(async (path: string) => {
    for (const key of [...files.keys()]) if (key.startsWith(path)) files.delete(key);
  }),
}));

import {
  adoptLegacyPublicData,
  resolveHealthOsDirectory,
  rewriteLegacyPhotoPaths,
} from '../src/core/storage/durableStorage';
import { createTestDb } from './helpers/sqliteDb';
import { MedicationRepository } from '../src/features/medications/medicationRepository';

function medicationWithPhoto(db: ReturnType<typeof createTestDb>, photoUri: string) {
  return new MedicationRepository(db).create({
    name: 'Metformin',
    medicationType: 'tablet',
    currentQuantity: 10,
    photoUri,
    schedule: { type: 'fixed_daily', timesOfDay: [{ hour: 8, minute: 0 }], startDate: '2026-09-13' },
  }).medication.id;
}

describe('durable storage', () => {
  beforeEach(() => {
    files.clear();
    unreadable = false;
  });

  it('keeps the database in app-private storage', async () => {
    files.set(`${PUBLIC_DIR}health-os.db`, 'old');
    await expect(resolveHealthOsDirectory()).resolves.toBe(PRIVATE_DIR);
  });

  it('moves an old public database, its WAL and photos in once', async () => {
    files.set(`${PUBLIC_DIR}health-os.db`, 'db');
    files.set(`${PUBLIC_DIR}health-os.db-wal`, 'wal');
    files.set(`${PUBLIC_DIR}photos/a.jpg`, 'jpg');

    await adoptLegacyPublicData(PRIVATE_DIR);
    expect(files.get(`${PRIVATE_DIR}health-os.db`)).toBe('db');
    expect(files.get(`${PRIVATE_DIR}health-os.db-wal`)).toBe('wal');
    expect(files.get(`${PRIVATE_DIR}photos/a.jpg`)).toBe('jpg');

    files.set(`${PRIVATE_DIR}health-os.db`, 'newer');
    await adoptLegacyPublicData(PRIVATE_DIR);
    expect(files.get(`${PRIVATE_DIR}health-os.db`)).toBe('newer');
  });

  it('points old photo paths at the private folder, on any later launch too', () => {
    const db = createTestDb();
    const legacy = medicationWithPhoto(db, `${PUBLIC_DIR}photos/a.jpg`);
    const other = medicationWithPhoto(db, `${PRIVATE_DIR}photos/b.jpg`);

    // Run twice: a launch that was killed after the copy gets repaired by the next one.
    rewriteLegacyPhotoPaths(db, PRIVATE_DIR);
    rewriteLegacyPhotoPaths(db, PRIVATE_DIR);

    const repo = new MedicationRepository(db);
    expect(repo.getById(legacy)?.photoUri).toBe(`${PRIVATE_DIR}photos/a.jpg`);
    expect(repo.getById(other)?.photoUri).toBe(`${PRIVATE_DIR}photos/b.jpg`);
  });

  it('starts fresh instead of failing when the old files are unreadable after a reinstall', async () => {
    files.set(`${PUBLIC_DIR}health-os.db`, 'db');
    files.set(`${PUBLIC_DIR}photos/a.jpg`, 'jpg');
    unreadable = true;

    await adoptLegacyPublicData(PRIVATE_DIR);
    expect([...files.keys()].filter((key) => key.startsWith(PRIVATE_DIR))).toEqual([]);
  });
});

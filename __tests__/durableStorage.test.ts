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
} from '../src/core/storage/durableStorage';

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

    await expect(adoptLegacyPublicData(PRIVATE_DIR)).resolves.toBe(PUBLIC_DIR);
    expect(files.get(`${PRIVATE_DIR}health-os.db`)).toBe('db');
    expect(files.get(`${PRIVATE_DIR}health-os.db-wal`)).toBe('wal');
    expect(files.get(`${PRIVATE_DIR}photos/a.jpg`)).toBe('jpg');

    files.set(`${PRIVATE_DIR}health-os.db`, 'newer');
    await expect(adoptLegacyPublicData(PRIVATE_DIR)).resolves.toBeNull();
    expect(files.get(`${PRIVATE_DIR}health-os.db`)).toBe('newer');
  });

  it('starts fresh instead of failing when the old files are unreadable after a reinstall', async () => {
    files.set(`${PUBLIC_DIR}health-os.db`, 'db');
    files.set(`${PUBLIC_DIR}photos/a.jpg`, 'jpg');
    unreadable = true;

    await expect(adoptLegacyPublicData(PRIVATE_DIR)).resolves.toBeNull();
    expect([...files.keys()].filter((key) => key.startsWith(PRIVATE_DIR))).toEqual([]);
  });
});

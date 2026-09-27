import { getInstallId } from '../../src/core/observability/installId';
import { getObservabilityDb, setObservabilityDbForTests } from '../../src/core/observability/observabilityDb';
import { getCurrentRoute, setCurrentRoute } from '../../src/core/observability/currentRoute';
import { collectCrashContext } from '../../src/core/observability/scrubber';
import type { SQLiteDatabase } from 'expo-sqlite';

function createKvDb() {
  const kv = new Map<string, string>();
  const db = {
    execSync: jest.fn(),
    closeSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM kv WHERE key = ?')) {
        const value = kv.get(String(params?.[0]));
        return value == null ? null : { value };
      }
      return null;
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT OR REPLACE INTO kv')) {
        kv.set(String(params?.[0]), String(params?.[1]));
      }
    }),
  };
  return db as unknown as SQLiteDatabase;
}

describe('installId and route context', () => {
  beforeEach(() => {
    setObservabilityDbForTests(createKvDb());
  });

  afterEach(() => {
    setObservabilityDbForTests(null);
    setCurrentRoute(null);
  });

  it('persists a stable install id', () => {
    const first = getInstallId();
    const second = getInstallId();
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(8);
  });

  it('redacts uuids when setting the current route', () => {
    setCurrentRoute('/medicine/3f1c0a2e-9b44-4d1a-8c77-1ab2cd34ef56');
    expect(getCurrentRoute()).toBe('/medicine/:id');
  });

  it('collects allowlisted device context', () => {
    const context = collectCrashContext();
    expect(context.appVersion).toBe('2.0.1');
    expect(context.osVersion).toBe('34');
    expect(context.deviceModel).toContain('SM-S911B');
    expect(context.installId.length).toBeGreaterThan(8);
  });

  it('opens the private sqlite database when no test override is set', () => {
    setObservabilityDbForTests(null);
    const db = getObservabilityDb();
    expect(db.execSync).toHaveBeenCalled();
    setObservabilityDbForTests(createKvDb());
  });
});

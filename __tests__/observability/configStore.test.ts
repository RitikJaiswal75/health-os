import {
  readCachedObservabilityConfig,
  writeCachedObservabilityConfig,
  readConfigEtag,
  writeConfigEtag,
} from '../../src/core/observability/configStore';
import { setObservabilityDbForTests } from '../../src/core/observability/observabilityDb';
import { BUNDLED_DEFAULT_CONFIG } from '../../src/core/observability/configSchema';
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

describe('configStore', () => {
  beforeEach(() => {
    setObservabilityDbForTests(createKvDb());
  });

  afterEach(() => {
    setObservabilityDbForTests(null);
  });

  it('returns null when nothing is cached', () => {
    expect(readCachedObservabilityConfig()).toBeNull();
  });

  it('round-trips a valid config and etag', () => {
    writeCachedObservabilityConfig(BUNDLED_DEFAULT_CONFIG);
    writeConfigEtag('"abc123"');
    expect(readCachedObservabilityConfig()).toEqual(BUNDLED_DEFAULT_CONFIG);
    expect(readConfigEtag()).toBe('"abc123"');
  });
});

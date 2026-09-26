import {
  applyRemoteObservabilityConfig,
  flushCrashOutbox,
  getActiveObservabilityConfig,
  initCrashReporting,
  reportError,
  resetCrashReporterForTests,
  setAdaptersForTests,
} from '../../src/core/observability/crashReporter';
import { setObservabilityDbForTests } from '../../src/core/observability/observabilityDb';
import type { CrashEvent, CrashReporterAdapter, ObservabilityConfig } from '../../src/core/observability/types';
import type { SQLiteDatabase } from 'expo-sqlite';

const config: ObservabilityConfig = {
  version: 1,
  enabled: true,
  primary: 'sentry',
  fallback: 'crashlytics',
  captureNonFatal: true,
  sampleRate: 1,
  sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
};

type Row = { id: string; payload: string; created_at: string; attempts: number };

function createMemoryDb() {
  let rows: Row[] = [];
  const kv = new Map<string, string>();
  const db = {
    execSync: jest.fn(),
    closeSync: jest.fn(),
    getAllSync: jest.fn(() => [...rows]),
    getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM kv WHERE key = ?')) {
        const value = kv.get(String(params?.[0]));
        return value == null ? null : { value };
      }
      if (sql.includes('COUNT(*)')) return { count: rows.length };
      if (sql.includes('ORDER BY created_at ASC LIMIT 1')) {
        return rows[0] ? { id: rows[0].id } : null;
      }
      return null;
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT OR REPLACE INTO kv')) {
        kv.set(String(params?.[0]), String(params?.[1]));
        return;
      }
      if (sql.includes('INSERT INTO crash_outbox')) {
        rows = [
          ...rows,
          {
            id: String(params?.[0]),
            payload: String(params?.[1]),
            created_at: String(params?.[2]),
            attempts: 0,
          },
        ];
        return;
      }
      if (sql.includes('DELETE FROM crash_outbox WHERE id = ?')) {
        rows = rows.filter((row) => row.id !== params?.[0]);
        return;
      }
      if (sql.includes('DELETE FROM crash_outbox WHERE created_at <')) {
        return;
      }
      if (sql.includes('UPDATE crash_outbox SET attempts')) {
        rows = rows.map((row) =>
          row.id === params?.[0] ? { ...row, attempts: row.attempts + 1 } : row,
        );
      }
    }),
  };
  return db as unknown as SQLiteDatabase;
}

function adapter(id: 'sentry' | 'crashlytics', capture: jest.Mock): CrashReporterAdapter {
  return { id, init: jest.fn(), capture };
}

describe('crashReporter', () => {
  beforeEach(() => {
    resetCrashReporterForTests();
    setObservabilityDbForTests(createMemoryDb());
  });

  afterEach(() => {
    resetCrashReporterForTests();
    setObservabilityDbForTests(null);
  });

  it('stores the active config on init', () => {
    initCrashReporting(config);
    expect(getActiveObservabilityConfig()).toEqual(config);
  });

  it('skips adapters when observability is disabled', () => {
    initCrashReporting({ ...config, enabled: false });
    applyRemoteObservabilityConfig({ ...config, enabled: false });
    expect(getActiveObservabilityConfig().enabled).toBe(false);
  });

  it('routes a non-fatal error to the primary adapter', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const crash = adapter('crashlytics', jest.fn(async () => true));
    initCrashReporting(config);
    setAdaptersForTests({ sentry, crashlytics: crash });

    await reportError('DOSE_MARK_FAILED', new Error('secret med name'));
    expect(sentry.capture).toHaveBeenCalledTimes(1);
    const sent = (sentry.capture as jest.Mock).mock.calls[0][0] as CrashEvent;
    expect(sent.message).toBeNull();
    expect(sent.errorCode).toBe('DOSE_MARK_FAILED');
    expect(crash.capture).toHaveBeenCalledTimes(1);
  });

  it('switches non-fatal routing when remote config changes', async () => {
    const sentry = adapter('sentry', jest.fn(async () => true));
    const crash = adapter('crashlytics', jest.fn(async () => true));
    initCrashReporting(config);
    setAdaptersForTests({ sentry, crashlytics: crash });
    applyRemoteObservabilityConfig({ ...config, primary: 'crashlytics', fallback: 'none' });
    expect(getActiveObservabilityConfig().primary).toBe('crashlytics');
    await reportError('DOSE_MARK_FAILED', new Error('secret med name'));
    expect(crash.capture).toHaveBeenCalledTimes(1);
    expect(sentry.capture).not.toHaveBeenCalled();
  });

  it('flushes the outbox through the current adapters', async () => {
    const capture = jest.fn(async () => true);
    const sentry = adapter('sentry', capture);
    initCrashReporting(config);
    setAdaptersForTests({ sentry });
    capture.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await reportError('ALARM_SCHEDULE_FAILED', new Error('alarm'));
    await flushCrashOutbox();
    expect(capture).toHaveBeenCalled();
  });
});

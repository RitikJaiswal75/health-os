import { refreshObservabilityConfig } from '../../src/core/observability/configLoader';
import { BUNDLED_DEFAULT_CONFIG } from '../../src/core/observability/configSchema';
import * as configStore from '../../src/core/observability/configStore';

jest.mock('../../src/core/observability/configStore', () => ({
  readCachedObservabilityConfig: jest.fn(),
  writeCachedObservabilityConfig: jest.fn(),
  readConfigEtag: jest.fn(),
  writeConfigEtag: jest.fn(),
}));

describe('configLoader', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('writes a valid remote payload through to the store', async () => {
    const remote = {
      version: 1,
      enabled: true,
      primary: 'sentry',
      fallback: 'crashlytics',
      captureNonFatal: true,
      sampleRate: 1,
      sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
    };
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name === 'ETag' ? '"etag-1"' : null) },
        json: async () => remote,
      }) as unknown as Response,
    );

    await expect(refreshObservabilityConfig()).resolves.toEqual(remote);
    expect(configStore.writeCachedObservabilityConfig).toHaveBeenCalledWith(remote);
    expect(configStore.writeConfigEtag).toHaveBeenCalledWith('"etag-1"');
  });

  it('keeps the cache on 304', async () => {
    (configStore.readCachedObservabilityConfig as jest.Mock).mockReturnValue(
      BUNDLED_DEFAULT_CONFIG,
    );
    (configStore.readConfigEtag as jest.Mock).mockReturnValue('"etag-1"');
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        status: 304,
        headers: { get: () => null },
        json: async () => ({}),
      }) as unknown as Response,
    );

    await expect(refreshObservabilityConfig()).resolves.toEqual(BUNDLED_DEFAULT_CONFIG);
    expect(configStore.writeCachedObservabilityConfig).not.toHaveBeenCalled();
  });

  it('returns null when the network fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });
    await expect(refreshObservabilityConfig()).resolves.toBeNull();
  });

  it('rejects an invalid remote payload', async () => {
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ primary: 'sentry' }),
      }) as unknown as Response,
    );
    await expect(refreshObservabilityConfig()).resolves.toBeNull();
    expect(configStore.writeCachedObservabilityConfig).not.toHaveBeenCalled();
  });
});

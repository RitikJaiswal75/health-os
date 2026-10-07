import { refreshAppUpdateConfig } from '../../src/features/appUpdate/appUpdateLoader';
import * as appUpdateCache from '../../src/features/appUpdate/appUpdateCache';

jest.mock('../../src/features/appUpdate/appUpdateCache', () => ({
  readCachedAppUpdateConfig: jest.fn(),
  writeCachedAppUpdateConfig: jest.fn(),
  readAppUpdateEtag: jest.fn(),
  writeAppUpdateEtag: jest.fn(),
}));

const REMOTE = { version: 1, android: { latestVersion: '2.1.0', minSupportedVersion: '2.0.2' } };

function respond(status: number, body: unknown, etag: string | null = null): jest.Mock {
  return jest.fn(async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name === 'ETag' ? etag : null) },
      json: async () => body,
    }) as unknown as Response,
  );
}

describe('appUpdateLoader', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('fetches /v1/app-update and caches a valid config with its ETag', async () => {
    const fetchMock = respond(200, REMOTE, '"etag-1"');
    global.fetch = fetchMock;

    await expect(refreshAppUpdateConfig()).resolves.toEqual(REMOTE);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/app-update?platform=android');
    expect(appUpdateCache.writeCachedAppUpdateConfig).toHaveBeenCalledWith(REMOTE);
    expect(appUpdateCache.writeAppUpdateEtag).toHaveBeenCalledWith('"etag-1"');
  });

  it('sends If-None-Match and returns the cached config on 304', async () => {
    (appUpdateCache.readAppUpdateEtag as jest.Mock).mockReturnValue('"etag-1"');
    (appUpdateCache.readCachedAppUpdateConfig as jest.Mock).mockReturnValue(REMOTE);
    const fetchMock = respond(304, {});
    global.fetch = fetchMock;

    await expect(refreshAppUpdateConfig()).resolves.toEqual(REMOTE);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['If-None-Match']).toBe('"etag-1"');
    expect(appUpdateCache.writeCachedAppUpdateConfig).not.toHaveBeenCalled();
  });

  it('returns null and keeps the cache when the network fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });
    await expect(refreshAppUpdateConfig()).resolves.toBeNull();
    expect(appUpdateCache.writeCachedAppUpdateConfig).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload without touching the cache', async () => {
    global.fetch = respond(200, { version: 1, android: { latestVersion: 'latest' } });
    await expect(refreshAppUpdateConfig()).resolves.toBeNull();
    expect(appUpdateCache.writeCachedAppUpdateConfig).not.toHaveBeenCalled();
  });
});

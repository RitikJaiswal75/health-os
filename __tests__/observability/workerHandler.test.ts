import { handleRequest, type Env } from '../../workers/app-config/src/index';
import { BUNDLED_DEFAULT_CONFIG } from '../../src/core/observability/configSchema';

function envWith(value: string | null): Env {
  return {
    APP_CONFIG: {
      get: async () => value,
    } as Env['APP_CONFIG'],
  };
}

describe('app-config worker', () => {
  it('returns ok on /health', async () => {
    const response = await handleRequest(
      new Request('https://config.healthos.ritik.cc/health'),
      envWith(null),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('returns bundled defaults when KV is empty', async () => {
    const response = await handleRequest(
      new Request('https://config.healthos.ritik.cc/v1/observability'),
      envWith(null),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=900');
    expect(response.headers.get('ETag')).toMatch(/^"[0-9a-f]+"$/);
    await expect(response.json()).resolves.toEqual(BUNDLED_DEFAULT_CONFIG);
  });

  it('returns stored config when it passes the schema', async () => {
    const stored = {
      version: 1,
      enabled: true,
      primary: 'sentry',
      fallback: 'crashlytics',
      captureNonFatal: true,
      sampleRate: 1,
      sentryDsn: 'https://abc@o1.ingest.sentry.io/2',
    };
    const response = await handleRequest(
      new Request('https://config.healthos.ritik.cc/v1/observability'),
      envWith(JSON.stringify(stored)),
    );
    await expect(response.json()).resolves.toEqual(stored);
  });

  it('falls back to bundled defaults when KV JSON is invalid', async () => {
    const response = await handleRequest(
      new Request('https://config.healthos.ritik.cc/v1/observability'),
      envWith('{"primary":"sentry"}'),
    );
    await expect(response.json()).resolves.toEqual(BUNDLED_DEFAULT_CONFIG);
  });

  it('returns 304 when If-None-Match matches', async () => {
    const first = await handleRequest(
      new Request('https://config.healthos.ritik.cc/v1/observability'),
      envWith(null),
    );
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await handleRequest(
      new Request('https://config.healthos.ritik.cc/v1/observability', {
        headers: { 'If-None-Match': etag ?? '' },
      }),
      envWith(null),
    );
    expect(second.status).toBe(304);
  });

  it('returns 404 for unknown paths', async () => {
    const response = await handleRequest(
      new Request('https://config.healthos.ritik.cc/search'),
      envWith(null),
    );
    expect(response.status).toBe(404);
  });
});

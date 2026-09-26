import { BUNDLED_DEFAULT_CONFIG, parseObservabilityConfig } from '../../../src/core/observability/configSchema';

export interface Env {
  APP_CONFIG: {
    get(key: string): Promise<string | null>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

const CACHE_CONTROL = 'public, max-age=900';
const CONFIG_KEY = 'observability';

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

async function etagFor(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  return `"${hex}"`;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({ ok: true });
  }

  if (url.pathname !== '/v1/observability') {
    return json({ error: 'Not found' }, 404);
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const stored = await env.APP_CONFIG.get(CONFIG_KEY);
  let parsed = null;
  if (stored) {
    try {
      parsed = parseObservabilityConfig(JSON.parse(stored) as unknown);
    } catch {
      parsed = null;
    }
  }
  const config = parsed ?? BUNDLED_DEFAULT_CONFIG;
  const body = JSON.stringify(config);
  const etag = await etagFor(body);

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...CORS_HEADERS,
        ETag: etag,
        'Cache-Control': CACHE_CONTROL,
      },
    });
  }

  return json(config, 200, {
    ETag: etag,
    'Cache-Control': CACHE_CONTROL,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

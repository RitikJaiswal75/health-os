import { CACHE_CONTROL, CONFIG_ROUTES, CORS_HEADERS } from './constants';
import type { ConfigRoute, Env } from './types';

export type { Env } from './types';

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

async function readConfig(route: ConfigRoute, env: Env): Promise<unknown> {
  const stored = await env.APP_CONFIG.get(route.kvKey);
  if (!stored) return route.fallback;
  try {
    return route.parse(JSON.parse(stored) as unknown) ?? route.fallback;
  } catch {
    return route.fallback;
  }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({ ok: true });
  }

  const route = CONFIG_ROUTES[url.pathname];
  if (!route) {
    return json({ error: 'Not found' }, 404);
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const config = await readConfig(route, env);
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

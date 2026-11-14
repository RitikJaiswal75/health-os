import { sanitizeFtsQuery } from './fts';
import type { DrugRow, EdgeCache, Env, WorkerContext } from './types';

export type { Env } from './types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

function edgeCache(): EdgeCache | undefined {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
}

export default {
  async fetch(request: Request, env: Env, ctx?: WorkerContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true });
    }

    if (url.pathname !== '/search') {
      return json({ error: 'Not found' }, 404);
    }

    // Cloudflare does not cache a Worker's own responses from Cache-Control; only the Cache API does.
    const cache = request.method === 'GET' ? edgeCache() : undefined;
    // The cache only speeds search up: a failed read is a miss, never an outage.
    const hit = await cache?.match(request).catch(() => undefined);
    if (hit) return hit;

    const response = await search(url, env);
    if (cache && ctx && response.headers.has('Cache-Control')) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  },
};

async function search(url: URL, env: Env): Promise<Response> {
  const query = (url.searchParams.get('q') ?? '').trim();
  if (query.length < 2) {
    return json({ results: [] });
  }

  const ftsQuery = sanitizeFtsQuery(query);
  if (!ftsQuery) {
    return json({ results: [] });
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 50);

  try {
    const { results } = await env.DB.prepare(
      `SELECT rowid as id, name, strength, form
         FROM drug_search
         WHERE drug_search MATCH ?
         ORDER BY rank
         LIMIT ?`,
    )
      .bind(ftsQuery, limit)
      .all<DrugRow>();

    // Data only changes on re-seed, so the edge can answer repeat queries for a day.
    return json({ results }, 200, { 'Cache-Control': 'public, max-age=86400' });
  } catch (error) {
    // Show in Cloudflare logs and analytics; the app treats any non-OK response as no results.
    console.error('drug_search query failed', error);
    return json({ results: [] }, 503);
  }
}

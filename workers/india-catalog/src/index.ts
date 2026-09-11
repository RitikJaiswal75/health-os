import { sanitizeFtsQuery } from './fts';

export interface Env {
  DB: D1Database;
}

interface DrugRow {
  id: number;
  name: string;
  strength: string | null;
  form: string | null;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    const query = (url.searchParams.get('q') ?? '').trim();
    if (query.length < 2) {
      return json({ results: [] });
    }

    const ftsQuery = sanitizeFtsQuery(query);
    if (!ftsQuery) {
      return json({ results: [] });
    }

    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20), 1), 50);

    try {
      const { results } = await env.DB.prepare(
        `SELECT rowid as id, name, strength, form
         FROM drug_search
         WHERE drug_search MATCH ?
         LIMIT ?`,
      )
        .bind(ftsQuery, limit)
        .all<DrugRow>();

      return json({ results });
    } catch {
      return json({ results: [] });
    }
  },
};

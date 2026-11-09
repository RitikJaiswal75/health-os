import worker, { type Env } from '../../workers/india-catalog/src/index';

function envWhereQuery(all: () => Promise<{ results: unknown[] }>): Env {
  return {
    DB: { prepare: () => ({ bind: () => ({ all }) }) },
  } as unknown as Env;
}

const search = (env: Env) =>
  worker.fetch(new Request('https://drugs.healthos.ritik.cc/search?q=dolo'), env);

describe('india-catalog worker', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns matches', async () => {
    const hit = { id: 1, name: 'Dolo 650', strength: '650 mg', form: 'tablet' };
    const response = await search(envWhereQuery(async () => ({ results: [hit] })));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ results: [hit] });
  });

  it('orders matches best first and lets the edge cache them', async () => {
    const prepare = jest.fn(() => ({ bind: () => ({ all: async () => ({ results: [] }) }) }));
    const env = { DB: { prepare } } as unknown as Env;
    const response = await worker.fetch(
      new Request('https://drugs.healthos.ritik.cc/search?q=para'),
      env,
    );
    expect((prepare.mock.calls[0] as unknown as [string])[0]).toMatch(/ORDER BY rank\s+LIMIT/);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('answers a repeat search from the edge cache without touching D1', async () => {
    const stored = new Map<string, Response>();
    const pending: Promise<unknown>[] = [];
    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: async (req: Request) => stored.get(req.url)?.clone(),
        put: async (req: Request, res: Response) => {
          stored.set(req.url, res);
        },
      },
    };
    const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p) };
    const all = jest.fn(async () => ({ results: [{ id: 1, name: 'Dolo 650', strength: null, form: null }] }));
    const env = envWhereQuery(all);
    const url = 'https://drugs.healthos.ritik.cc/search?q=dolo';
    try {
      await worker.fetch(new Request(url), env, ctx);
      await Promise.all(pending);
      const second = await worker.fetch(new Request(url), env, ctx);

      expect(all).toHaveBeenCalledTimes(1);
      await expect(second.json()).resolves.toEqual({
        results: [{ id: 1, name: 'Dolo 650', strength: null, form: null }],
      });
    } finally {
      delete (globalThis as { caches?: unknown }).caches;
    }
  });

  it('does not cache a failed search', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await search(
      envWhereQuery(async () => {
        throw new Error('D1_ERROR');
      }),
    );
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('uses the default limit when limit is not a number', async () => {
    const bind = jest.fn(() => ({ all: async () => ({ results: [] }) }));
    const env = { DB: { prepare: () => ({ bind }) } } as unknown as Env;
    const response = await worker.fetch(
      new Request('https://drugs.healthos.ritik.cc/search?q=dolo&limit=abc'),
      env,
    );
    expect(response.status).toBe(200);
    expect(bind).toHaveBeenCalledWith('"dolo"*', 20);
  });

  it('reports a database failure as an error, not as "no results"', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await search(
      envWhereQuery(async () => {
        throw new Error('D1_ERROR: quota exceeded');
      }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ results: [] });
    expect(logged).toHaveBeenCalled();
  });
});

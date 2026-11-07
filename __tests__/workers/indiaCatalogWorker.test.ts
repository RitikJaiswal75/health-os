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

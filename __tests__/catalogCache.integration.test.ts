// Real SQLite: a failed catalog fetch (offline, 5xx) returns [] and must not hide results later.
import { createTestDb } from './helpers/sqliteDb';
import {
  CatalogCacheRepository,
  loadCachedOrFetch,
  type CatalogResult,
} from '../src/features/catalog/catalogService';

jest.mock('@/src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

const paracetamol: CatalogResult = { id: 'india:1', name: 'Paracetamol', source: 'india', rank: 30 };

describe('loadCachedOrFetch', () => {
  it('fetches again after a failed (empty) fetch instead of serving a cached []', async () => {
    const cache = new CatalogCacheRepository(createTestDb());
    const offline = jest.fn().mockResolvedValue([]);
    const online = jest.fn().mockResolvedValue([paracetamol]);

    await loadCachedOrFetch(cache, 'india', 'paracetamol', offline);
    const results = await loadCachedOrFetch(cache, 'india', 'paracetamol', online);

    expect(results).toEqual([paracetamol]);
    expect(online).toHaveBeenCalledTimes(1);
  });

  it('serves real results from the cache without fetching', async () => {
    const cache = new CatalogCacheRepository(createTestDb());
    await loadCachedOrFetch(cache, 'india', 'paracetamol', jest.fn().mockResolvedValue([paracetamol]));
    const fetcher = jest.fn();

    expect(await loadCachedOrFetch(cache, 'india', 'paracetamol', fetcher)).toEqual([paracetamol]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

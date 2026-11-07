import { reportError } from '../src/core/observability/crashReporter';
import { searchDsld, searchRxTerms } from '../src/features/catalog/catalogService';
import { searchIndiaCatalogAsync } from '../src/features/catalog/indiaCatalog.native';

jest.mock('../src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));
jest.mock('../src/features/catalog/indiaCatalogConfig', () => ({
  getIndiaCatalogApiUrl: () => 'https://india.example.test',
}));

const searches = [
  ['rxterms', searchRxTerms],
  ['dsld', searchDsld],
  ['india', searchIndiaCatalogAsync],
] as const;

describe('catalog fetch error reporting', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it.each(searches)('%s: does not report offline/DNS/TLS failures', async (_name, search) => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(search('augmentin')).resolves.toEqual([]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it.each(searches)('%s: still reports unexpected failures', async (_name, search) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('JSON Parse error')),
    });
    await expect(search('augmentin')).resolves.toEqual([]);
    expect(reportError).toHaveBeenCalledWith('CATALOG_FETCH_FAILED', expect.any(SyntaxError));
  });
});

import { ensureCatalog, refreshCatalog } from '../src/i18n/catalogLoader';
import { reportError } from '../src/core/observability/crashReporter';
import {
  t,
  hasCatalog,
  resetI18nForTests,
  setLocaleForTests,
} from '../src/i18n/translate';

jest.mock('../src/core/observability/crashReporter', () => ({ reportError: jest.fn() }));

describe('catalogLoader', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    resetI18nForTests();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does not report an offline refresh as a crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(refreshCatalog('hi')).resolves.toBe(false);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('still reports a broken language pack', async () => {
    global.fetch = jest.fn(async () =>
      ({ ok: true, json: () => Promise.reject(new SyntaxError('JSON Parse error')) }) as unknown as Response,
    );
    await expect(refreshCatalog('hi')).resolves.toBe(false);
    expect(reportError).toHaveBeenCalledWith('I18N_CATALOG_FAILED', expect.any(SyntaxError));
  });

  it('leaves English bundled without fetching', async () => {
    global.fetch = jest.fn();
    await expect(ensureCatalog('en')).resolves.toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('registers a remote language pack from the website', async () => {
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          'review.title': 'ಔಷಧವನ್ನು ಪರಿಶೀಲಿಸಿ',
          'tabs.today': 'ಇಂದು',
        }),
      }) as Response,
    );

    await expect(ensureCatalog('kn')).resolves.toBe(true);
    expect(hasCatalog('kn')).toBe(true);
    setLocaleForTests('kn');
    expect(t('review.title')).toBe('ಔಷಧವನ್ನು ಪರಿಶೀಲಿಸಿ');
    expect(t('common.save')).toBe('Save');
  });

  it('keeps English fallback when a pack cannot be downloaded', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });

    await expect(ensureCatalog('ta')).resolves.toBe(false);
    expect(hasCatalog('ta')).toBe(false);
    setLocaleForTests('ta');
    expect(t('review.title')).toBe('Review medication');
  });
});

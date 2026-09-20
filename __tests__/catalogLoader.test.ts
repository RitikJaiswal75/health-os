import { ensureCatalog } from '../src/i18n/catalogLoader';
import {
  t,
  hasCatalog,
  resetI18nForTests,
  setLocaleForTests,
} from '../src/i18n/translate';

describe('catalogLoader', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    resetI18nForTests();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
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

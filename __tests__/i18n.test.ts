import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en, type MessageCatalog } from '../src/i18n/en';
import { APP_LOCALES, resolveAppLocale, type AppLocale } from '../src/i18n/locales';
import {
  interpolate,
  t,
  registerCatalog,
  resetI18nForTests,
  setLocaleForTests,
} from '../src/i18n/translate';

function loadWebsitePack(locale: AppLocale): MessageCatalog {
  const file = path.join(__dirname, `../website/public/i18n/${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as MessageCatalog;
}

describe('i18n', () => {
  afterEach(() => {
    resetI18nForTests();
  });

  it('maps Indian device language tags onto supported app locales', () => {
    expect(resolveAppLocale('hi-IN')).toBe('hi');
    expect(resolveAppLocale('ta')).toBe('ta');
    expect(resolveAppLocale('ur-PK')).toBe('ur');
    expect(resolveAppLocale('en-IN')).toBe('en');
    expect(resolveAppLocale('fr-FR')).toBe('en');
  });

  it('interpolates named placeholders', () => {
    expect(interpolate('Time to take {{name}}', { name: 'Dolo' })).toBe('Time to take Dolo');
  });

  it('falls back to English when a key is missing in the active locale', () => {
    registerCatalog('hi', { 'tabs.today': 'आज' });
    setLocaleForTests('hi');
    expect(t('tabs.today')).toBe('आज');
    expect(t('common.save')).toBe('Save');
  });

  it('localizes reminder copy for Hindi from the website pack', () => {
    registerCatalog('hi', loadWebsitePack('hi'));
    setLocaleForTests('hi');
    expect(t('reminder.dueTitle')).toBe('दवा का समय');
    expect(t('reminder.dueBody', { name: 'Dolo' })).toBe('Dolo लेने का समय है');
  });

  it('marks Urdu as a right-to-left locale', () => {
    const urdu = APP_LOCALES.find((locale) => locale.code === 'ur');
    expect(urdu?.rtl).toBe(true);
    expect(APP_LOCALES.find((locale) => locale.code === 'hi')?.rtl).toBe(false);
  });

  it('uses natural Hindi for interval, weekday, and monthly schedules', () => {
    registerCatalog('hi', loadWebsitePack('hi'));
    setLocaleForTests('hi');
    expect(t('schedule.everyXDays')).toBe('हर X दिनों में');
    expect(t('schedule.everyWeek')).toBe('सप्ताह के चुने हुए दिन');
    expect(t('schedule.everyMonth')).toBe('हर महीने');
    expect(t('schedule.everyNDays', { count: 3 })).toBe('हर 3 दिनों में');
  });

  it('covers every English key in website language packs', () => {
    const expected = Object.keys(en).sort();
    for (const locale of APP_LOCALES) {
      expect({ locale: locale.code, keys: Object.keys(loadWebsitePack(locale.code)).sort() }).toEqual({
        locale: locale.code,
        keys: expected,
      });
    }
  });

  it('localizes review copy outside English', () => {
    registerCatalog('ta', loadWebsitePack('ta'));
    registerCatalog('gu', loadWebsitePack('gu'));
    registerCatalog('or', loadWebsitePack('or'));
    registerCatalog('kn', loadWebsitePack('kn'));
    setLocaleForTests('ta');
    expect(t('review.title')).not.toBe(en['review.title']);
    setLocaleForTests('gu');
    expect(t('review.saveMedication')).not.toBe(en['review.saveMedication']);
    setLocaleForTests('or');
    expect(t('schedule.everyWeek')).not.toBe(en['schedule.everyWeek']);
    setLocaleForTests('kn');
    expect(t('review.title')).toBe('ಔಷಧವನ್ನು ಪರಿಶೀಲಿಸಿ');
  });

  it('uses English by default', () => {
    expect(t('tabs.today')).toBe('Today');
    expect(t('common.cancel')).toBe('Cancel');
  });
});

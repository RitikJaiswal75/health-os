import { en, type MessageKey, type MessageCatalog } from './en';
import type { AppLocale } from './locales';
import { APP_LOCALES } from './locales';

export type { MessageKey, Messages, MessageCatalog } from './en';

let activeLocale: AppLocale = 'en';

const catalogs: Record<AppLocale, MessageCatalog> = {
  en,
  hi: {},
  bn: {},
  te: {},
  mr: {},
  ta: {},
  ur: {},
  gu: {},
  kn: {},
  ml: {},
  or: {},
  pa: {},
  as: {},
};

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = vars[name];
    return value == null ? '' : String(value);
  });
}

export function getActiveLocale(): AppLocale {
  return activeLocale;
}

export function setActiveLocale(locale: AppLocale): void {
  activeLocale = locale;
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const localized = catalogs[activeLocale][key] ?? en[key];
  return interpolate(localized, vars);
}

export function tCount(
  oneKey: MessageKey,
  otherKey: MessageKey,
  count: number,
  extra?: Record<string, string | number>,
): string {
  const key = count === 1 ? oneKey : otherKey;
  return t(key, { count, ...extra });
}

export function registerCatalog(locale: AppLocale, catalog: MessageCatalog): void {
  catalogs[locale] = catalog;
}

export function hasCatalog(locale: AppLocale): boolean {
  if (locale === 'en') return true;
  return Object.keys(catalogs[locale]).length > 0;
}

export function resetI18nForTests(): void {
  activeLocale = 'en';
  for (const locale of APP_LOCALES) {
    if (locale.code !== 'en') {
      catalogs[locale.code] = {};
    }
  }
}

export function setLocaleForTests(locale: AppLocale): void {
  activeLocale = locale;
}

import type { Locale } from 'date-fns';
import { bn, enIN, gu, hi, kn, ta, te } from 'date-fns/locale';
import type { AppLocale } from './locales';
import { getActiveLocale } from './translate';

const DATE_LOCALES: Partial<Record<AppLocale, Locale>> = {
  en: enIN,
  hi,
  bn,
  te,
  ta,
  gu,
  kn,
};

export function getDateFnsLocale(locale: AppLocale = getActiveLocale()): Locale {
  return DATE_LOCALES[locale] ?? enIN;
}

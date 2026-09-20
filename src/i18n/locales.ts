export const APP_LOCALES = [
  { code: 'en', englishName: 'English', nativeName: 'English', rtl: false },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', rtl: false },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', rtl: false },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  { code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  { code: 'as', englishName: 'Assamese', nativeName: 'অসমীয়া', rtl: false },
] as const;

export type AppLocale = (typeof APP_LOCALES)[number]['code'];
export type LocalePreference = 'system' | AppLocale;

const LOCALE_CODES = new Set<string>(APP_LOCALES.map((locale) => locale.code));

export function isAppLocale(value: string): value is AppLocale {
  return LOCALE_CODES.has(value);
}

export function getLocaleMeta(code: AppLocale) {
  return APP_LOCALES.find((locale) => locale.code === code) ?? APP_LOCALES[0];
}

/** Map a BCP-47 tag (hi-IN, ta, ur-PK) onto a supported app locale. */
export function resolveAppLocale(languageTag: string | null | undefined): AppLocale {
  if (!languageTag) return 'en';
  const normalized = languageTag.trim().replace('_', '-').toLowerCase();
  const language = normalized.split('-')[0];
  if (language === 'or' || language === 'ori') return 'or';
  if (isAppLocale(language)) return language;
  return 'en';
}

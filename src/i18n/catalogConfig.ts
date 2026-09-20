/** Language JSON packs served by the marketing site (Cloudflare Pages). */
export const DEFAULT_I18N_BASE_URL = 'https://healthos.ritik.cc/i18n';

export function getI18nBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_I18N_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return DEFAULT_I18N_BASE_URL;
}

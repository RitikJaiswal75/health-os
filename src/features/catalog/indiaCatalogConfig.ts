import Constants from 'expo-constants';

/** Production India catalog API (Cloudflare Worker + D1). */
export const DEFAULT_INDIA_CATALOG_API_URL = 'https://drugs.healthos.ritik.cc';

export function getIndiaCatalogApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_INDIA_CATALOG_URL?.trim();
  if (fromEnv) return fromEnv;

  const fromExtra = Constants.expoConfig?.extra?.indiaCatalogUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim();
  }

  return DEFAULT_INDIA_CATALOG_API_URL;
}

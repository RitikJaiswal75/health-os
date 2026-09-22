import * as FileSystem from 'expo-file-system/legacy';
import type { AppLocale } from './locales';
import type { MessageCatalog } from './en';
import { getI18nBaseUrl } from './catalogConfig';
import { hasCatalog, registerCatalog } from './translate';
import { reportError } from '@/src/core/observability/crashReporter';

const FETCH_TIMEOUT_MS = 10_000;
const pending = new Map<AppLocale, Promise<boolean>>();

function cacheDir(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}i18n/` : null;
}

function cachePath(locale: AppLocale): string | null {
  const dir = cacheDir();
  return dir ? `${dir}${locale}.json` : null;
}

function asMessageCatalog(value: unknown): MessageCatalog | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.messages;
  const source =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : record;
  const catalog: MessageCatalog = {};
  for (const [key, entry] of Object.entries(source)) {
    if (typeof entry === 'string') {
      catalog[key as keyof MessageCatalog] = entry;
    }
  }
  return Object.keys(catalog).length > 0 ? catalog : null;
}

async function readCachedCatalog(locale: AppLocale): Promise<MessageCatalog | null> {
  try {
    const path = cachePath(locale);
    if (!path) return null;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return asMessageCatalog(JSON.parse(await FileSystem.readAsStringAsync(path)));
  } catch {
    return null;
  }
}

async function writeCachedCatalog(locale: AppLocale, catalog: MessageCatalog): Promise<void> {
  try {
    const dir = cacheDir();
    const path = cachePath(locale);
    if (!dir || !path) return;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(path, JSON.stringify(catalog));
  } catch {
    // Cache is best-effort.
  }
}

async function fetchRemoteCatalog(locale: AppLocale): Promise<MessageCatalog | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${getI18nBaseUrl()}/${locale}.json`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return asMessageCatalog(await response.json());
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    reportError('I18N_CATALOG_FAILED', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadCatalog(locale: AppLocale): Promise<boolean> {
  if (locale === 'en' || hasCatalog(locale)) return true;

  const cached = await readCachedCatalog(locale);
  if (cached) {
    registerCatalog(locale, cached);
    return true;
  }

  const remote = await fetchRemoteCatalog(locale);
  if (!remote) return false;
  registerCatalog(locale, remote);
  await writeCachedCatalog(locale, remote);
  return true;
}

/** Load a locale pack from disk cache or the website. English is always bundled. */
export function ensureCatalog(locale: AppLocale): Promise<boolean> {
  if (locale === 'en' || hasCatalog(locale)) return Promise.resolve(true);
  const existing = pending.get(locale);
  if (existing) return existing;
  const request = loadCatalog(locale).finally(() => {
    pending.delete(locale);
  });
  pending.set(locale, request);
  return request;
}

/** Replace a cached pack with a fresh copy from the website when online. */
export async function refreshCatalog(locale: AppLocale): Promise<boolean> {
  if (locale === 'en') return true;
  const remote = await fetchRemoteCatalog(locale);
  if (!remote) return false;
  registerCatalog(locale, remote);
  await writeCachedCatalog(locale, remote);
  return true;
}

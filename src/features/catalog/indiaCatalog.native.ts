import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { searchIndiaLocal, type CatalogResult } from './catalogService';
import {
  DEFAULT_INDIA_CATALOG_DB_URL,
  INDIA_CATALOG_DB_NAME,
  INDIA_CATALOG_META_FILENAME,
  INDIA_CATALOG_VERSION_URL,
  type IndiaCatalogState,
  type IndiaCatalogVersionMeta,
} from './indiaCatalogConfig';

export type { IndiaCatalogState } from './indiaCatalogConfig';

let indiaDb: SQLite.SQLiteDatabase | null = null;
let loadPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;
let catalogState: IndiaCatalogState = 'idle';
let catalogError: string | null = null;
const stateListeners = new Set<(state: IndiaCatalogState) => void>();

function sqliteDirectory(): string {
  return `${FileSystem.documentDirectory}SQLite/`;
}

function dbPath(): string {
  return `${sqliteDirectory()}${INDIA_CATALOG_DB_NAME}`;
}

function metaPath(): string {
  return `${sqliteDirectory()}${INDIA_CATALOG_META_FILENAME}`;
}

function setCatalogState(state: IndiaCatalogState): void {
  catalogState = state;
  for (const listener of stateListeners) listener(state);
}

export function getIndiaCatalogState(): IndiaCatalogState {
  return catalogState;
}

export function getIndiaCatalogError(): string | null {
  return catalogError;
}

export function subscribeIndiaCatalogState(
  listener: (state: IndiaCatalogState) => void,
): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

async function readLocalVersion(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(metaPath());
    if (!info.exists) return 0;
    const raw = await FileSystem.readAsStringAsync(metaPath());
    const parsed = JSON.parse(raw) as IndiaCatalogVersionMeta;
    return parsed.version ?? 0;
  } catch {
    return 0;
  }
}

async function writeLocalVersion(meta: IndiaCatalogVersionMeta): Promise<void> {
  await FileSystem.writeAsStringAsync(metaPath(), JSON.stringify(meta));
}

async function fetchRemoteVersion(): Promise<IndiaCatalogVersionMeta | null> {
  try {
    const response = await fetch(INDIA_CATALOG_VERSION_URL);
    if (!response.ok) return null;
    return (await response.json()) as IndiaCatalogVersionMeta;
  } catch {
    return null;
  }
}

async function downloadCatalog(dbUrl: string): Promise<void> {
  const dir = sqliteDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const tempPath = `${dir}${INDIA_CATALOG_DB_NAME}.download`;
  const result = await FileSystem.downloadAsync(dbUrl, tempPath);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Catalog download failed (${result.status})`);
  }

  await FileSystem.moveAsync({ from: tempPath, to: dbPath() });
}

async function ensureIndiaCatalogLoaded(): Promise<SQLite.SQLiteDatabase | null> {
  if (indiaDb) return indiaDb;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      setCatalogState('downloading');
      catalogError = null;

      const remote = await fetchRemoteVersion();
      const localVersion = await readLocalVersion();
      const dbInfo = await FileSystem.getInfoAsync(dbPath());
      const needsDownload =
        !dbInfo.exists || (remote != null && remote.version > localVersion);

      if (needsDownload) {
        const dbUrl = remote?.dbUrl ?? DEFAULT_INDIA_CATALOG_DB_URL;
        await downloadCatalog(dbUrl);
        if (remote) {
          await writeLocalVersion(remote);
        }
      }

      indiaDb = SQLite.openDatabaseSync(INDIA_CATALOG_DB_NAME);
      setCatalogState('ready');
      return indiaDb;
    } catch (err) {
      catalogError = err instanceof Error ? err.message : 'Failed to load India catalog';
      indiaDb = null;
      setCatalogState('error');
      return null;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Pre-download catalog in the background (e.g. on first app open). */
export function prepareIndiaCatalog(): void {
  void ensureIndiaCatalogLoaded();
}

export async function searchIndiaCatalogAsync(query: string): Promise<CatalogResult[]> {
  const db = await ensureIndiaCatalogLoaded();
  return db ? searchIndiaLocal(db, query) : [];
}

/** Sync wrapper — returns empty until async download completes. */
export function searchIndiaCatalog(query: string): CatalogResult[] {
  if (indiaDb) return searchIndiaLocal(indiaDb, query);
  void ensureIndiaCatalogLoaded();
  return [];
}

export function getIndiaCatalogDb(): SQLite.SQLiteDatabase | null {
  return indiaDb;
}

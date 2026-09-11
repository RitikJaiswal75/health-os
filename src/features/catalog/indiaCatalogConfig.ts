export type IndiaCatalogState = 'idle' | 'downloading' | 'ready' | 'error';

/** GitHub-hosted India medicine catalog (not bundled in the app). */
export const INDIA_CATALOG_GITHUB_REPO = 'RitikJaiswal75/health-os';
export const INDIA_CATALOG_BRANCH = 'main';

export const INDIA_CATALOG_VERSION_URL =
  `https://raw.githubusercontent.com/${INDIA_CATALOG_GITHUB_REPO}/${INDIA_CATALOG_BRANCH}/data/catalog-version.json`;

export const INDIA_CATALOG_DB_NAME = 'india-catalog.db';
export const INDIA_CATALOG_META_FILENAME = 'india-catalog.meta.json';

export interface IndiaCatalogVersionMeta {
  version: number;
  builtAt: string;
  dbUrl: string;
}

export const DEFAULT_INDIA_CATALOG_DB_URL =
  `https://raw.githubusercontent.com/${INDIA_CATALOG_GITHUB_REPO}/${INDIA_CATALOG_BRANCH}/data/india.db`;

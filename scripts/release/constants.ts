import { resolve } from 'node:path';

export const REPO_ROOT = resolve(__dirname, '../..');
export const EXPO_BASE_JSON = 'expo.base.json';
export const PACKAGE_JSON = 'package.json';
export const DEFAULT_BASE_REF = 'main';

export const APP_CONFIG_BASE_URL = 'https://config.healthos.ritik.cc';
export const APP_UPDATE_CONFIG_FILE = 'workers/app-config/config/app-update.json';

/** Mirrors the `app` filter in .github/workflows/pr-checks.yml, plus the app-update config. */
export const APP_PATH_PATTERNS: readonly RegExp[] = [
  /^(app|src|modules|plugins|assets)\//,
  /^(package\.json|package-lock\.json|expo\.base\.json|app\.config\.js)$/,
  /^workers\/app-config\/config\/app-update\.json$/,
];
/** KV is eventually consistent across edges (up to ~60s), so poll for a couple of minutes. */
export const DEPLOY_VERIFY_ATTEMPTS = 12;
export const DEPLOY_VERIFY_DELAY_MS = 10_000;

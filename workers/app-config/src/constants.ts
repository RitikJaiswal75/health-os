import { BUNDLED_DEFAULT_CONFIG, parseObservabilityConfig } from '../../../src/core/observability/configSchema';
import { REMOTE_CONFIG_PATHS } from '../../../src/core/remoteConfig/constants';
import { parseAppUpdateConfig } from '../../../src/features/appUpdate/appUpdateSchema';
import { BUNDLED_DEFAULT_APP_UPDATE_CONFIG } from '../../../src/features/appUpdate/constants';
import type { ConfigRoute } from './types';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

export const CACHE_CONTROL = 'public, max-age=900';

/** `config-set --kind` values mapped to their worker path. */
export const CONFIG_KINDS = {
  observability: REMOTE_CONFIG_PATHS.observability,
  'app-update': REMOTE_CONFIG_PATHS.appUpdate,
} as const;

export const CONFIG_SCHEMA_HINTS: Record<keyof typeof CONFIG_KINDS, string> = {
  observability:
    'Required fields: version (>=1 integer), enabled, primary (sentry|crashlytics|none), fallback (sentry|crashlytics|none), captureNonFatal, sampleRate (0-1), sentryDsn (https DSN or empty string).',
  'app-update':
    'Required fields: version (>=1 integer). Per platform (android/ios): latestVersion (x.y.z), optional minSupportedVersion (x.y.z, <= latestVersion), optional storeUrl (https).',
};

export const CONFIG_ROUTES: Record<string, ConfigRoute> = {
  [REMOTE_CONFIG_PATHS.observability]: {
    kvKey: 'observability',
    parse: parseObservabilityConfig,
    fallback: BUNDLED_DEFAULT_CONFIG,
  },
  [REMOTE_CONFIG_PATHS.appUpdate]: {
    kvKey: 'app-update',
    parse: parseAppUpdateConfig,
    fallback: BUNDLED_DEFAULT_APP_UPDATE_CONFIG,
  },
};

export const REMOTE_CONFIG_FETCH_TIMEOUT_MS = 10_000;

/** Worker paths, shared by the app loaders and the app-config worker route table. */
export const REMOTE_CONFIG_PATHS = {
  observability: '/v1/observability',
  appUpdate: '/v1/app-update',
} as const;

import type { AppUpdateConfig, UpdatePlatform } from './types';

/** `major[.minor[.patch[.build]]]`; pre-release suffixes (`2.1.0-beta`) are rejected. */
export const VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

export const UPDATE_PLATFORMS: readonly UpdatePlatform[] = ['android', 'ios'];

/** No platform entries means no prompt anywhere. */
export const BUNDLED_DEFAULT_APP_UPDATE_CONFIG: AppUpdateConfig = { version: 1 };

/** Keys in the observability KV table (`healthos-observability.db`). */
export const APP_UPDATE_KV_KEYS = {
  config: 'app_update_config',
  etag: 'app_update_etag',
  skippedVersion: 'app_update_skipped',
} as const;

/** Routes the force-update overlay never covers, so medication alarms can be acknowledged. */
export const FORCE_UPDATE_EXEMPT_ROUTES: readonly string[] = ['/reminder'];

export const ANDROID_PACKAGE = 'com.health.os';
export const PLAY_STORE_MARKET_URL = `market://details?id=${ANDROID_PACKAGE}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

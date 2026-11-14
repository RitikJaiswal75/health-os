import { UPDATE_PLATFORMS } from './constants';
import type { AppUpdateConfig, PlatformUpdateConfig } from './types';
import { compareParsedVersions, parseVersion } from './versionCompare';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Only the Play Store listing: a tampered config must not send the update button anywhere else. */
function isPlayStoreUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'play.google.com';
  } catch {
    return false;
  }
}

/**
 * Old installs must keep reading newer configs, so unknown keys are ignored and only the
 * fields this parser uses are validated. Returns `undefined` for an invalid entry.
 */
function parsePlatformConfig(value: unknown): PlatformUpdateConfig | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const latest = parseVersion(record.latestVersion);
  if (!latest) return undefined;
  const config: PlatformUpdateConfig = { latestVersion: String(record.latestVersion).trim() };

  if (record.minSupportedVersion !== undefined) {
    const min = parseVersion(record.minSupportedVersion);
    if (!min || compareParsedVersions(min, latest) > 0) return undefined;
    config.minSupportedVersion = String(record.minSupportedVersion).trim();
  }

  if (record.storeUrl !== undefined) {
    if (typeof record.storeUrl !== 'string' || !isPlayStoreUrl(record.storeUrl)) return undefined;
    config.storeUrl = record.storeUrl;
  }

  return config;
}

export function parseAppUpdateConfig(value: unknown): AppUpdateConfig | null {
  const record = asRecord(value);
  if (!record) return null;

  const version = record.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return null;
  }

  const config: AppUpdateConfig = { version };
  for (const platform of UPDATE_PLATFORMS) {
    if (record[platform] === undefined) continue;
    const parsed = parsePlatformConfig(record[platform]);
    if (!parsed) return null;
    config[platform] = parsed;
  }
  return config;
}

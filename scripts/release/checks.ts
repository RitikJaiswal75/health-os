import { UPDATE_PLATFORMS } from '../../src/features/appUpdate/constants';
import type { AppUpdateConfig } from '../../src/features/appUpdate/types';
import { compareParsedVersions, parseVersion } from '../../src/features/appUpdate/versionCompare';
import { APP_PATH_PATTERNS } from './constants';
import type { ExpoVersionInfo } from './types';

/** True when any path is part of the shipped app, so a version bump is required. */
export function touchesAppPaths(paths: readonly string[]): boolean {
  return paths.some((path) => APP_PATH_PATTERNS.some((pattern) => pattern.test(path)));
}

export function readExpoVersionInfo(expoBaseJson: unknown): ExpoVersionInfo {
  const expo = (expoBaseJson as { expo?: { version?: unknown; android?: { versionCode?: unknown } } })
    ?.expo;
  const versionCode = expo?.android?.versionCode;
  return {
    version: typeof expo?.version === 'string' ? expo.version : '',
    versionCode: typeof versionCode === 'number' && Number.isInteger(versionCode) ? versionCode : null,
  };
}

function formatVersionInfo(info: ExpoVersionInfo): string {
  return `${info.version || '(missing)'}, versionCode ${info.versionCode ?? '(missing)'}`;
}

/** Returns human-readable failures; empty means the PR bumps the app version correctly. */
export function checkVersionBump(
  base: ExpoVersionInfo,
  head: ExpoVersionInfo,
  packageVersion: string,
): string[] {
  const errors: string[] = [];
  const baseVersion = parseVersion(base.version);
  const headVersion = parseVersion(head.version);

  if (!headVersion) {
    errors.push(`expo.base.json version "${head.version}" is not a valid x.y.z version.`);
  } else if (baseVersion && compareParsedVersions(headVersion, baseVersion) <= 0) {
    errors.push(
      `expo.base.json version ${head.version} must be greater than main (${base.version}). Bump it or remove app changes.`,
    );
  }

  if (head.versionCode == null) {
    errors.push('expo.base.json android.versionCode must be an integer.');
  } else if (base.versionCode != null && head.versionCode <= base.versionCode) {
    errors.push(
      `expo.base.json android.versionCode ${head.versionCode} must be greater than main (${base.versionCode}). Play rejects uploads that reuse a versionCode.`,
    );
  }

  if (packageVersion !== head.version) {
    errors.push(
      `package.json version ${packageVersion} must equal expo.base.json version ${head.version}.`,
    );
  }

  if (errors.length > 0) {
    errors.push(`main: ${formatVersionInfo(base)} · this PR: ${formatVersionInfo(head)}`);
  }
  return errors;
}

/** The config must never advertise a version that this branch hasn't built yet. */
export function checkAdvertisedVersion(config: AppUpdateConfig, headVersion: string): string[] {
  const head = parseVersion(headVersion);
  if (!head) return [`expo.base.json version "${headVersion}" is not a valid x.y.z version.`];

  return UPDATE_PLATFORMS.flatMap((platform) => {
    const latest = config[platform]?.latestVersion;
    const parsed = parseVersion(latest);
    if (!latest || !parsed || compareParsedVersions(parsed, head) <= 0) return [];
    return [
      `app-update.json ${platform}.latestVersion ${latest} is newer than the app version ${headVersion}.`,
    ];
  });
}

/** Every advertised platform must point at the version this branch bumps to. */
export function checkLatestVersionMatches(config: AppUpdateConfig, headVersion: string): string[] {
  const head = parseVersion(headVersion);
  if (!head) return [`expo.base.json version "${headVersion}" is not a valid x.y.z version.`];

  const advertised = UPDATE_PLATFORMS.filter((platform) => config[platform]?.latestVersion);
  if (advertised.length === 0) {
    return [`app-update.json must set latestVersion ${headVersion} for at least one platform.`];
  }

  return advertised.flatMap((platform) => {
    const latest = config[platform]?.latestVersion ?? '';
    const parsed = parseVersion(latest);
    if (parsed && compareParsedVersions(parsed, head) === 0) return [];
    return [`app-update.json ${platform}.latestVersion ${latest} must equal the app version ${headVersion}.`];
  });
}

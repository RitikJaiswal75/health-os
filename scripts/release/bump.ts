import { parseVersion } from '../../src/features/appUpdate/versionCompare';
import { APP_UPDATE_CONFIG_FILE, EXPO_BASE_JSON, PACKAGE_JSON, PACKAGE_LOCK_JSON } from './constants';
import type { BumpLevel, VersionFiles } from './types';

/** 2.1.1 + minor → 2.2.0. Throws on a version that is not x.y.z. */
export function nextVersion(version: string, level: BumpLevel): string {
  const parsed = parseVersion(version);
  if (!parsed || parsed.length !== 3) throw new Error(`"${version}" is not an x.y.z version.`);
  const [major, minor, patch] = parsed;
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Replaces the first `count` `"key": <value>` matches, keeping the file's own formatting. */
function replaceFirst(text: string, pattern: RegExp, replacement: string, count: number): string {
  let left = count;
  return text.replace(pattern, (match) => (left-- > 0 ? replacement : match));
}

/**
 * Writes `version` / `versionCode` into every file the pre-commit check reads.
 * Text edits instead of JSON.stringify so expo.base.json keeps its inline arrays.
 */
export function applyVersion(files: VersionFiles, version: string, versionCode: number): VersionFiles {
  const anyVersion = /"version": "[^"]*"/g;
  return {
    // expo.version is the first "version" key in expo.base.json.
    [EXPO_BASE_JSON]: replaceFirst(
      files[EXPO_BASE_JSON].replace(/"versionCode": \d+/, `"versionCode": ${versionCode}`),
      anyVersion,
      `"version": "${version}"`,
      1,
    ),
    [PACKAGE_JSON]: replaceFirst(files[PACKAGE_JSON], anyVersion, `"version": "${version}"`, 1),
    // Lockfile: the root "version" and packages[""].version.
    [PACKAGE_LOCK_JSON]: replaceFirst(files[PACKAGE_LOCK_JSON], anyVersion, `"version": "${version}"`, 2),
    [APP_UPDATE_CONFIG_FILE]: files[APP_UPDATE_CONFIG_FILE].replace(
      /"latestVersion": "[^"]*"/g,
      `"latestVersion": "${version}"`,
    ),
  };
}

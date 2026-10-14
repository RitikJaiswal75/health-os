import type { PlatformUpdateConfig, UpdatePreferences, UpdateState } from './types';
import { compareParsedVersions, parseVersion } from './versionCompare';

export function resolveUpdateState(
  currentVersion: string | null | undefined,
  platformConfig: PlatformUpdateConfig | undefined,
  { skippedVersion, laterDismissed }: UpdatePreferences,
): UpdateState {
  if (!platformConfig) return 'none';
  const current = parseVersion(currentVersion);
  const latest = parseVersion(platformConfig.latestVersion);
  if (!current || !latest) return 'none';

  const min = parseVersion(platformConfig.minSupportedVersion);
  if (min && compareParsedVersions(current, min) < 0) return 'force';

  if (compareParsedVersions(current, latest) >= 0) return 'none';
  if (laterDismissed) return 'none';
  const skipped = parseVersion(skippedVersion);
  if (skipped && compareParsedVersions(skipped, latest) === 0) return 'none';
  return 'optional';
}

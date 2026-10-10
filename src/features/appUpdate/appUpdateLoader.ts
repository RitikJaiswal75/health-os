import { REMOTE_CONFIG_PATHS } from '@/src/core/remoteConfig/constants';
import { fetchRemoteConfig } from '@/src/core/remoteConfig/fetchRemoteConfig';
import {
  readAppUpdateEtag,
  readCachedAppUpdateConfig,
  writeAppUpdateEtag,
  writeCachedAppUpdateConfig,
} from './appUpdateCache';
import { parseAppUpdateConfig } from './appUpdateSchema';
import type { AppUpdateConfig } from './types';

let inFlight: Promise<AppUpdateConfig | null> | null = null;

/** Overlapping callers share one request, so an older response can never overwrite a newer one. */
export function refreshAppUpdateConfig(): Promise<AppUpdateConfig | null> {
  inFlight ??= fetchRemoteConfig({
    path: REMOTE_CONFIG_PATHS.appUpdate,
    parse: parseAppUpdateConfig,
    cache: {
      readCached: readCachedAppUpdateConfig,
      writeCached: writeCachedAppUpdateConfig,
      readEtag: readAppUpdateEtag,
      writeEtag: writeAppUpdateEtag,
    },
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

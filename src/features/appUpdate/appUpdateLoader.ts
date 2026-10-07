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

export function refreshAppUpdateConfig(): Promise<AppUpdateConfig | null> {
  return fetchRemoteConfig({
    path: REMOTE_CONFIG_PATHS.appUpdate,
    parse: parseAppUpdateConfig,
    cache: {
      readCached: readCachedAppUpdateConfig,
      writeCached: writeCachedAppUpdateConfig,
      readEtag: readAppUpdateEtag,
      writeEtag: writeAppUpdateEtag,
    },
  });
}

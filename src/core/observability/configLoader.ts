import { REMOTE_CONFIG_PATHS } from '@/src/core/remoteConfig/constants';
import { fetchRemoteConfig } from '@/src/core/remoteConfig/fetchRemoteConfig';
import { parseObservabilityConfig } from './configSchema';
import {
  readCachedObservabilityConfig,
  readConfigEtag,
  writeCachedObservabilityConfig,
  writeConfigEtag,
} from './configStore';
import type { ObservabilityConfig } from './types';

export function refreshObservabilityConfig(): Promise<ObservabilityConfig | null> {
  return fetchRemoteConfig({
    path: REMOTE_CONFIG_PATHS.observability,
    parse: parseObservabilityConfig,
    cache: {
      readCached: readCachedObservabilityConfig,
      writeCached: writeCachedObservabilityConfig,
      readEtag: readConfigEtag,
      writeEtag: writeConfigEtag,
    },
  });
}

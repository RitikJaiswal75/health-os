import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { readCachedAppUpdateConfig, readSkippedVersion, writeSkippedVersion } from './appUpdateCache';
import { UPDATE_PLATFORMS } from './constants';
import type { AppUpdateConfig, AppUpdateStatus, AppUpdateStoreState, UpdatePlatform } from './types';
import { resolveUpdateState } from './updateDecision';

function readSafely<T>(read: () => T | null): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}

function currentPlatform(): UpdatePlatform | null {
  return (UPDATE_PLATFORMS as readonly string[]).includes(Platform.OS)
    ? (Platform.OS as UpdatePlatform)
    : null;
}

/** Hydrates synchronously from cache so a force update still applies offline on first render. */
export const useAppUpdateStore = create<AppUpdateStoreState>((set) => ({
  config: readSafely(readCachedAppUpdateConfig),
  skippedVersion: readSafely(readSkippedVersion),
  laterDismissed: false,
  setConfig: (config: AppUpdateConfig) => set({ config }),
  dismissLater: () => set({ laterDismissed: true }),
  skip: (version: string) => {
    try {
      writeSkippedVersion(version);
    } catch {
      // Still hide the banner for this session if persistence fails.
    }
    set({ skippedVersion: version });
  },
}));

export function useAppUpdateStatus(): AppUpdateStatus {
  const config = useAppUpdateStore((store) => store.config);
  const skippedVersion = useAppUpdateStore((store) => store.skippedVersion);
  const laterDismissed = useAppUpdateStore((store) => store.laterDismissed);
  const platform = currentPlatform();
  const platformConfig = platform ? config?.[platform] : undefined;

  return {
    state: resolveUpdateState(Constants.expoConfig?.version, platformConfig, {
      skippedVersion,
      laterDismissed,
    }),
    platformConfig,
  };
}

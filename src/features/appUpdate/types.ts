export type Version = readonly number[];

export type UpdatePlatform = 'android' | 'ios';

export type PlatformUpdateConfig = {
  latestVersion: string;
  /** Installs strictly below this version are forced to update. */
  minSupportedVersion?: string;
  storeUrl?: string;
};

export type AppUpdateConfig = {
  version: number;
  android?: PlatformUpdateConfig;
  ios?: PlatformUpdateConfig;
};

export type UpdateState = 'force' | 'optional' | 'none';

export type UpdatePreferences = {
  skippedVersion: string | null;
  laterDismissed: boolean;
};

export type AppUpdateStoreState = UpdatePreferences & {
  config: AppUpdateConfig | null;
  setConfig: (config: AppUpdateConfig) => void;
  /** Hides the optional banner for this session only. */
  dismissLater: () => void;
  /** Hides the optional banner until a newer latestVersion ships. */
  skip: (version: string) => void;
};

export type AppUpdateStatus = {
  state: UpdateState;
  platformConfig: PlatformUpdateConfig | undefined;
};

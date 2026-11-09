export type ExpoVersionInfo = {
  version: string;
  versionCode: number | null;
};

export type BumpLevel = 'major' | 'minor' | 'patch';

/** Raw text of every file that carries the app version, keyed by repo path. */
export type VersionFiles = Record<string, string>;

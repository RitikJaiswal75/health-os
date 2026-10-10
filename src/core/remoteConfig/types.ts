export type RemoteConfigCache<T> = {
  readCached: () => T | null;
  writeCached: (config: T) => void;
  readEtag: () => string | null;
  writeEtag: (etag: string) => void;
};

export type RemoteConfigRequest<T> = {
  /** Worker path, e.g. `/v1/observability`. */
  path: string;
  parse: (value: unknown) => T | null;
  cache: RemoteConfigCache<T>;
};

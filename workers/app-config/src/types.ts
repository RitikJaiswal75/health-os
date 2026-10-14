export type Env = {
  APP_CONFIG: {
    get(key: string): Promise<string | null>;
  };
};

export type ConfigRoute = {
  /** KV key holding the config document. */
  kvKey: string;
  parse: (value: unknown) => unknown;
  /** Served when KV is empty or its value fails the schema. */
  fallback: unknown;
};

// Only the Workers APIs this worker uses, so the app's tsconfig can type-check it (as app-config does).
export type Env = {
  DB: {
    prepare(query: string): {
      bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }> };
    };
  };
};

export type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

/** Cloudflare's per-colo cache (`caches.default`); absent outside the Workers runtime. */
export type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

export type DrugRow = {
  id: number;
  name: string;
  strength: string | null;
  form: string | null;
};

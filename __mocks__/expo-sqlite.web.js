/** Web stub — avoids loading wa-sqlite.wasm during Metro web bundles. */

function createStubDb() {
  return {
    execSync: () => {},
    runSync: () => {},
    getAllSync: () => [],
    getFirstSync: () => null,
    closeSync: () => {},
  };
}

export function openDatabaseSync() {
  return createStubDb();
}

export function openDatabaseAsync() {
  return Promise.resolve(createStubDb());
}

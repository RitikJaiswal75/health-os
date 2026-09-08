import type { DbBootstrapResult, SQLiteDatabase } from './clientTypes';

export type { DbBootstrapResult, SQLiteDatabase };

const WEB_MESSAGE =
  'Health OS requires the Android or iOS app. Install the development build on a device.';

export async function bootstrapDatabase(): Promise<DbBootstrapResult> {
  return { status: 'error', message: WEB_MESSAGE };
}

export function getDatabase(): never {
  throw new Error(WEB_MESSAGE);
}

export function resetDatabaseForTests(): void {
  // no-op on web
}

export async function retryBootstrap(): Promise<DbBootstrapResult> {
  return bootstrapDatabase();
}

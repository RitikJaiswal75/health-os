import type { SQLiteDatabase } from 'expo-sqlite';

export type DbBootstrapResult =
  | { status: 'ready'; db: SQLiteDatabase }
  | { status: 'error'; message: string };

export type { SQLiteDatabase };

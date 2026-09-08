import { useEffect, useState } from 'react';
import type { SQLiteDatabase } from './clientTypes';
import { bootstrapDatabase, retryBootstrap } from './client';

export type DbContextValue =
  | { status: 'loading' }
  | { status: 'ready'; db: SQLiteDatabase }
  | { status: 'error'; message: string; retry: () => void };

export function useDatabaseBootstrap(): DbContextValue {
  const [state, setState] = useState<DbContextValue>({ status: 'loading' });

  const init = async () => {
    setState({ status: 'loading' });
    const result = await bootstrapDatabase();
    if (result.status === 'ready') {
      setState({ status: 'ready', db: result.db });
    } else {
      setState({
        status: 'error',
        message: result.message,
        retry: () => {
          void retryBootstrap().then((r: Awaited<ReturnType<typeof retryBootstrap>>) => {
            if (r.status === 'ready') {
              setState({ status: 'ready', db: r.db });
            } else {
              setState({
                status: 'error',
                message: r.message,
                retry: () => init(),
              });
            }
          });
        },
      });
    }
  };

  useEffect(() => {
    void init();
  }, []);

  return state;
}

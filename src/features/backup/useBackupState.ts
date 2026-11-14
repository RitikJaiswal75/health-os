import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { readBackupState } from './backupState';
import type { BackupState } from './types';

/** `now` is taken when the state loads, so render stays pure. */
export function useBackupState(): [BackupState | null, () => void, number] {
  const [state, setState] = useState<BackupState | null>(null);
  const [now, setNow] = useState(0);
  const refresh = useCallback(() => {
    void readBackupState().then((s) => {
      setState({ ...s });
      setNow(Date.now());
    });
  }, []);
  useFocusEffect(refresh);
  return [state, refresh, now];
}

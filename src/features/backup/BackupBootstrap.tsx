import { useEffect } from 'react';
import { AppState } from 'react-native';
import { runBackup } from './backupService';
import { readBackupState } from './backupState';
import { setBackgroundBackup } from './backupTask';

/** Mounted inside the database gate. Renders nothing; keeps the background job and the run on leaving the app going. */
export function BackupBootstrap() {
  useEffect(() => {
    void readBackupState().then((state) => setBackgroundBackup(state.enabled));
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') void runBackup('auto');
    });
    return () => sub.remove();
  }, []);
  return null;
}

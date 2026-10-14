import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshAppUpdateConfig } from './appUpdateLoader';
import { useAppUpdateStore } from './appUpdateStore';

/** Refreshes on launch and on every foreground, so returning from the Play Store re-evaluates. */
export function AppUpdateBootstrap() {
  const setConfig = useAppUpdateStore((store) => store.setConfig);

  useEffect(() => {
    const refresh = () => {
      void refreshAppUpdateConfig().then((config) => {
        if (config) setConfig(config);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [setConfig]);

  return null;
}

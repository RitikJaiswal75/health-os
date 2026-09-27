import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { refreshObservabilityConfig } from './configLoader';
import {
  applyRemoteObservabilityConfig,
  flushCrashOutbox,
} from './crashReporter';
import { setCurrentRoute } from './currentRoute';

export function ObservabilityBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    setCurrentRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    void refreshObservabilityConfig().then((config) => {
      if (config) applyRemoteObservabilityConfig(config);
    });
    void flushCrashOutbox();
  }, []);

  return null;
}

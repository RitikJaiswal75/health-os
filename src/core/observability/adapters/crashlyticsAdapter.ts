import {
  getCrashlytics,
  recordError,
  setAttribute,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';
import type { CrashEvent, CrashReporterAdapter, ObservabilityConfig } from '../types';

function usesCrashlytics(config: ObservabilityConfig): boolean {
  return config.enabled && (config.primary === 'crashlytics' || config.fallback === 'crashlytics');
}

export function createCrashlyticsAdapter(): CrashReporterAdapter {
  return {
    id: 'crashlytics',
    async init(config: ObservabilityConfig): Promise<void> {
      try {
        const crashlytics = getCrashlytics();
        await setCrashlyticsCollectionEnabled(crashlytics, usesCrashlytics(config) || config.enabled);
      } catch {
        // Native module is missing in tests and Expo Go.
      }
    },
    async capture(event: CrashEvent): Promise<boolean> {
      try {
        const crashlytics = getCrashlytics();
        await setAttribute(crashlytics, 'error_code', event.errorCode);
        await setAttribute(crashlytics, 'install_id', event.installId);
        await setAttribute(crashlytics, 'route', event.routeName ?? '');
        const error = new Error(event.message ?? event.errorCode);
        error.name = event.errorName;
        error.stack = event.stackFrames.join('\n');
        recordError(crashlytics, error, event.errorCode);
        return true;
      } catch {
        return false;
      }
    },
  };
}

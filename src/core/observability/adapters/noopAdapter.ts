import type { CrashEvent, CrashReporterAdapter, ObservabilityConfig } from '../types';

export const noopAdapter: CrashReporterAdapter = {
  id: 'sentry',
  init(_config: ObservabilityConfig): void {
    return;
  },
  async capture(_event: CrashEvent): Promise<boolean> {
    return false;
  },
};

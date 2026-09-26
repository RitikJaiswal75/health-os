export type ProviderId = 'sentry' | 'crashlytics' | 'none';

export type CrashLevel = 'fatal' | 'error';

export interface ObservabilityConfig {
  version: number;
  enabled: boolean;
  primary: ProviderId;
  fallback: ProviderId;
  captureNonFatal: boolean;
  sampleRate: number;
  sentryDsn: string;
}

export interface CrashEvent {
  installId: string;
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  routeName: string | null;
  errorCode: string;
  errorName: string;
  stackFrames: string[];
  message: string | null;
  level: CrashLevel;
}

export interface CrashReporterAdapter {
  id: Exclude<ProviderId, 'none'>;
  init(config: ObservabilityConfig): Promise<void> | void;
  capture(event: CrashEvent): Promise<boolean>;
}

export interface CrashOutboxSink {
  enqueue(event: CrashEvent): void;
}

export type RouteResult = 'primary' | 'both' | 'outbox' | 'dropped';

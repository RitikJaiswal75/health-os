import Constants from 'expo-constants';

export const DEFAULT_OBSERVABILITY_CONFIG_URL = 'https://config.healthos.ritik.cc';

export function getObservabilityConfigUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_OBSERVABILITY_CONFIG_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = Constants.expoConfig?.extra?.observabilityConfigUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim().replace(/\/$/, '');
  }

  return DEFAULT_OBSERVABILITY_CONFIG_URL;
}

export function getAppVersion(): string {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : '0.0.0';
}

import { Linking } from 'react-native';
import { reportError } from '@/src/core/observability/crashReporter';
import { PLAY_STORE_MARKET_URL, PLAY_STORE_WEB_URL } from './constants';
import type { PlatformUpdateConfig } from './types';

/** Opens the Play Store app, falling back to the configured (or default) web listing. */
export async function openStore(platformConfig: PlatformUpdateConfig | undefined): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
    return;
  } catch {
    // No Play Store app (or no market:// handler); try the web listing.
  }
  try {
    await Linking.openURL(platformConfig?.storeUrl ?? PLAY_STORE_WEB_URL);
  } catch (error) {
    void reportError('APP_UPDATE_OPEN_STORE_FAILED', error);
  }
}

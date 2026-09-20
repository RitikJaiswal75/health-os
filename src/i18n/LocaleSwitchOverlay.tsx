import { Modal } from 'react-native';
import { AppLaunchScreen } from '@/src/core/components/AppLaunchScreen';
import { useLocaleStore } from './localeStore';

/**
 * Native modal so the splash sits above Expo Router's language screen.
 * Paper Portal cannot cover a stack `presentation: 'modal'`.
 */
export function LocaleSwitchOverlay() {
  const switching = useLocaleStore((state) => state.switching);

  return (
    <Modal
      visible={switching}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={() => undefined}
    >
      <AppLaunchScreen />
    </Modal>
  );
}

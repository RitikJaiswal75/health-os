import { useEffect } from 'react';
import { BackHandler, Image, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { usePathname } from 'expo-router';
import { useAppUpdateStatus } from '@/src/features/appUpdate/appUpdateStore';
import { FORCE_UPDATE_EXEMPT_ROUTES } from '@/src/features/appUpdate/constants';
import { openStore } from '@/src/features/appUpdate/openStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

/** Blocks the app on unsupported builds. Never covers the reminder screen. */
export function ForceUpdateOverlay() {
  const { state, platformConfig } = useAppUpdateStatus();
  const pathname = usePathname();
  const { t } = useT();
  const visible = state === 'force' && !FORCE_UPDATE_EXEMPT_ROUTES.includes(pathname);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.root} accessibilityViewIsModal accessibilityRole="alert">
      <Image
        source={require('../../../assets/images/Logo-adaptive.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text variant="headlineSmall" style={styles.title}>
        {t('update.force.title')}
      </Text>
      <Text variant="bodyLarge" style={styles.body}>
        {t('update.force.body')}
      </Text>
      <Button mode="contained" onPress={() => void openStore(platformConfig)} style={styles.button}>
        {t('update.now')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: healthOsTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    textAlign: 'center',
    color: healthOsTheme.colors.onSurfaceVariant,
    marginBottom: 32,
  },
  button: {
    alignSelf: 'stretch',
  },
});

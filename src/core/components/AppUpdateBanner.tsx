import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';
import { useAppUpdateStatus, useAppUpdateStore } from '@/src/features/appUpdate/appUpdateStore';
import { openStore } from '@/src/features/appUpdate/openStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export function AppUpdateBanner() {
  const { state, platformConfig } = useAppUpdateStatus();
  const dismissLater = useAppUpdateStore((store) => store.dismissLater);
  const skip = useAppUpdateStore((store) => store.skip);
  const { t } = useT();

  if (state !== 'optional' || !platformConfig) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Banner
        visible
        icon="update"
        style={styles.banner}
        actions={[
          {
            label: t('update.later'),
            onPress: dismissLater,
          },
          {
            label: t('update.skip'),
            onPress: () => skip(platformConfig.latestVersion),
          },
          {
            label: t('update.now'),
            onPress: () => void openStore(platformConfig),
          },
        ]}
        accessibilityRole="alert"
      >
        {t('update.optional.body', { version: platformConfig.latestVersion })}
      </Banner>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
  },
  banner: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
  },
});

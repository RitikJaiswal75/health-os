import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';
import {
  navigateToReliabilityScreen,
  shouldShowReminderPermissionBanner,
  usePermissionState,
} from '@/src/features/reliability/reliabilityService';
import { useReminderPermissionBannerStore } from '@/src/features/reliability/reminderPermissionBannerStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export function ReminderPermissionBanner() {
  const { state } = usePermissionState();
  const dismissed = useReminderPermissionBannerStore((store) => store.dismissed);
  const dismiss = useReminderPermissionBannerStore((store) => store.dismiss);
  const { t } = useT();
  const showBanner = shouldShowReminderPermissionBanner(state);

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Banner
        visible
        icon="bell-alert"
        style={styles.banner}
        actions={[
          {
            label: t('common.dismiss'),
            onPress: dismiss,
          },
          {
            label: t('banner.enable'),
            onPress: navigateToReliabilityScreen,
          },
        ]}
        accessibilityRole="alert"
      >
        {t('banner.body')}
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

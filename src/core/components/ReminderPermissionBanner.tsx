import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';
import {
  navigateToReliabilityScreen,
  shouldShowReminderPermissionBanner,
  usePermissionState,
} from '@/src/features/reliability/reliabilityService';
import { useReminderPermissionBannerStore } from '@/src/features/reliability/reminderPermissionBannerStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export function ReminderPermissionBanner() {
  const { state } = usePermissionState();
  const dismissed = useReminderPermissionBannerStore((store) => store.dismissed);
  const dismiss = useReminderPermissionBannerStore((store) => store.dismiss);
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
            label: 'Dismiss',
            onPress: dismiss,
          },
          {
            label: 'Enable permissions',
            onPress: navigateToReliabilityScreen,
          },
        ]}
        accessibilityRole="alert"
      >
        Please provide permission to get notified on medications.
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

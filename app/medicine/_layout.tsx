import { Stack } from 'expo-router';

import { StackHeaderWithBanner } from '@/src/core/components/StackHeaderWithBanner';
import { healthOsNavigationTheme } from '@/src/core/theme/navigationTheme';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export default function MedicineLayout() {
  const { t } = useT();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: (props) => <StackHeaderWithBanner {...props} />,
        headerStyle: { backgroundColor: healthOsTheme.colors.surface },
        headerTintColor: healthOsTheme.colors.onSurface,
        headerTitleStyle: { color: healthOsTheme.colors.onSurface },
        contentStyle: { backgroundColor: healthOsNavigationTheme.colors.background },
      }}
    >
      <Stack.Screen name="search" options={{ title: t('home.addMedication') }} />
      <Stack.Screen name="configure" options={{ title: t('configure.title') }} />
      <Stack.Screen
        name="shape"
        options={{
          title: t('shape.title'),
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF' },
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
      <Stack.Screen name="colour" options={{ title: t('colour.title') }} />
      <Stack.Screen name="schedule" options={{ title: t('schedule.title') }} />
      <Stack.Screen name="review" options={{ title: t('review.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('review.title') }} />
    </Stack>
  );
}

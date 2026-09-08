import { Stack } from 'expo-router';

import { healthOsNavigationTheme } from '@/src/core/theme/navigationTheme';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function MedicineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: healthOsTheme.colors.surface },
        headerTintColor: healthOsTheme.colors.onSurface,
        headerTitleStyle: { color: healthOsTheme.colors.onSurface },
        contentStyle: { backgroundColor: healthOsNavigationTheme.colors.background },
      }}
    >
      <Stack.Screen name="search" options={{ title: 'Add medication' }} />
      <Stack.Screen name="configure" options={{ title: 'Set information' }} />
      <Stack.Screen
        name="shape"
        options={{
          title: 'Choose shape',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF' },
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
      <Stack.Screen name="colour" options={{ title: 'Choose colours' }} />
      <Stack.Screen name="schedule" options={{ title: 'Set schedule' }} />
      <Stack.Screen name="review" options={{ title: 'Review medication' }} />
      <Stack.Screen name="[id]" options={{ title: 'Review medication' }} />
    </Stack>
  );
}

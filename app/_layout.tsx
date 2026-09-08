import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { healthOsNavigationTheme } from '@/src/core/theme/navigationTheme';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { DbBootstrapGate } from '@/src/db/DbBootstrapGate';
import { ReminderNotificationBootstrap } from '@/src/features/reminders/ReminderNotificationBootstrap';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={healthOsNavigationTheme}>
          <PaperProvider theme={healthOsTheme}>
            <DbBootstrapGate>
              <ReminderNotificationBootstrap />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: healthOsTheme.colors.background },
                }}
              >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="medicine" />
              <Stack.Screen name="reminder" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="about" options={{ presentation: 'modal', headerShown: true, title: 'About' }} />
              <Stack.Screen name="reliability" options={{ presentation: 'modal', headerShown: true, title: 'Reminder permissions' }} />
              </Stack>
            </DbBootstrapGate>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

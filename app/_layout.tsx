import 'react-native-get-random-values';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { healthOsNavigationTheme } from '@/src/core/theme/navigationTheme';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { StackHeaderWithBanner } from '@/src/core/components/StackHeaderWithBanner';
import { DbBootstrapGate } from '@/src/db/DbBootstrapGate';
import { ReminderNotificationBootstrap } from '@/src/features/reminders/ReminderNotificationBootstrap';
import { ReminderRouterReadyGate } from '@/src/features/reminders/ReminderRouterReadyGate';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { useT } from '@/src/i18n/useT';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { t } = useT();

  return (
    <DbBootstrapGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: healthOsTheme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medicine" />
        <Stack.Screen name="reminder" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen
          name="about"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: t('about.title'),
            header: (props) => <StackHeaderWithBanner {...props} />,
          }}
        />
        <Stack.Screen
          name="reliability"
          options={{ presentation: 'modal', headerShown: true, title: t('reliability.title') }}
        />
        <Stack.Screen
          name="language"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: t('language.title'),
            header: (props) => <StackHeaderWithBanner {...props} />,
          }}
        />
      </Stack>
      <ReminderRouterReadyGate />
      <ReminderNotificationBootstrap />
    </DbBootstrapGate>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={healthOsNavigationTheme}>
          <PaperProvider theme={healthOsTheme}>
            <I18nProvider>
              <RootNavigation />
            </I18nProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

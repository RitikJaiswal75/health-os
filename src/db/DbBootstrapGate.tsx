import { ReactNode, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { AppLaunchScreen } from '@/src/core/components/AppLaunchScreen';
import { useDatabaseBootstrap } from './DbProvider';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export function DbBootstrapGate({ children }: { children: ReactNode }) {
  const dbState = useDatabaseBootstrap();

  useEffect(() => {
    if (dbState.status === 'ready' || dbState.status === 'error') {
      void SplashScreen.hideAsync();
    }
  }, [dbState.status]);

  if (dbState.status === 'loading') {
    return <AppLaunchScreen />;
  }

  if (dbState.status === 'error') {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Could not open your health data</Text>
        <Text style={styles.error}>{dbState.message}</Text>
        <Button mode="contained" onPress={dbState.retry} accessibilityLabel="Retry opening database">
          Retry
        </Button>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: healthOsTheme.colors.background,
  },
  error: {
    color: healthOsTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

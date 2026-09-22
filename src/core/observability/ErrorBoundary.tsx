import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { reportFatal } from './crashReporter';

export type ErrorBoundaryProps = {
  error: Error;
  retry: () => Promise<void> | void;
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void reportFatal('ERROR_BOUNDARY', error);
  }, [error]);

  return (
    <View style={styles.center}>
      <Text variant="titleMedium" accessibilityRole="header">
        Something went wrong
      </Text>
      <Text style={styles.body}>
        Health OS hit an unexpected error. Your medication data is still on this device.
      </Text>
      <Button mode="contained" onPress={() => void retry()} accessibilityLabel="Try again">
        Try again
      </Button>
    </View>
  );
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
  body: {
    color: healthOsTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

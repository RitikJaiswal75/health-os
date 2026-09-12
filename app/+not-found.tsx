import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { healthOsTheme, tokens } from '@/src/core/theme/paperTheme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          This screen does not exist.
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyMedium" style={styles.linkText}>
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    backgroundColor: healthOsTheme.colors.background,
  },
  title: {
    fontWeight: 'bold',
    color: healthOsTheme.colors.onSurface,
  },
  link: {
    marginTop: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  linkText: {
    color: healthOsTheme.colors.primary,
  },
});

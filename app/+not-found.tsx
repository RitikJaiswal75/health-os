import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { healthOsTheme, tokens } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';

export default function NotFoundScreen() {
  const { t } = useT();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          {t('notFound.body')}
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="bodyMedium" style={styles.linkText}>
            {t('notFound.home')}
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

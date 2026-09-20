import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useT } from '@/src/i18n/useT';

export default function AboutScreen() {
  const { t } = useT();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleLarge">Health OS</Text>
      <Text variant="bodyMedium" style={styles.disclaimer}>
        {t('about.disclaimer')}
      </Text>
      <Text variant="titleMedium" style={styles.section}>
        {t('about.dataSources')}
      </Text>
      <Text variant="bodySmall">{t('about.indiaSource')}</Text>
      <Text variant="bodySmall" style={styles.section}>
        {t('about.usSource')}
      </Text>
      <Button mode="outlined" onPress={() => router.push('/reliability')} style={styles.section}>
        {t('about.troubleshoot')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  disclaimer: { marginTop: 8, lineHeight: 22 },
  section: { marginTop: 16 },
});

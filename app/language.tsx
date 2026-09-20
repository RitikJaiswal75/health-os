import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LanguagePicker } from '@/src/i18n/LanguagePicker';

function returnToPreviousScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}

export default function LanguageScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LanguagePicker showHeading={false} onSelected={returnToPreviousScreen} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
});

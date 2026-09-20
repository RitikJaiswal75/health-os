import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LanguagePicker } from '@/src/i18n/LanguagePicker';
import { LocaleSwitchOverlay } from '@/src/i18n/LocaleSwitchOverlay';

function returnToPreviousScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}

export default function LanguageScreen() {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <LanguagePicker showHeading={false} onSelected={returnToPreviousScreen} />
      </ScrollView>
      <LocaleSwitchOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});

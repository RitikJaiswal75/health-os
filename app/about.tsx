import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { router } from 'expo-router';

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleLarge">Health OS</Text>
      <Text variant="bodyMedium" style={styles.disclaimer}>
        Health OS is a personal medicine and supplement tracker. It is not medical advice,
        diagnosis, or treatment. Always consult a qualified healthcare provider about your medications.
      </Text>
      <Text variant="titleMedium" style={styles.section}>Data sources</Text>
      <Text variant="bodySmall">
        India drug names: NRCeS CDCI dataset (CC BY 4.0). C-DAC / NRCeS attribution required.
        Dataset version: bundled local copy.
      </Text>
      <Text variant="bodySmall" style={styles.section}>
        US drug names: NLM RxTerms (keyless API). Supplements: NIH DSLD (keyless API).
        NLM and NIH do not endorse this app.
      </Text>
      <Text variant="titleMedium" style={styles.section}>Quality gate</Text>
      <Text variant="bodySmall">
        Run locally before release: npm run typecheck && npm run lint && npm test
      </Text>
      <Button mode="outlined" onPress={() => router.push('/reliability')} style={styles.section}>
        Reminder reliability
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  disclaimer: { marginTop: 8, lineHeight: 22 },
  section: { marginTop: 16 },
});

import { StyleSheet, View } from 'react-native';
import { RadioButton, Text } from 'react-native-paper';
import { APP_LOCALES, type LocalePreference } from './locales';
import { beginLanguageSwitch, endLanguageSwitch, useLocaleStore, waitForLocaleUi } from './localeStore';
import { useT } from './useT';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

interface LanguagePickerProps {
  showHeading?: boolean;
  onSelected?: () => void;
}

export function LanguagePicker({ showHeading = true, onSelected }: LanguagePickerProps) {
  const { t } = useT();
  const preference = useLocaleStore((state) => state.preference);
  const setPreference = useLocaleStore((state) => state.setPreference);

  const applyLanguage = (value: LocalePreference) => {
    if (value === preference) return;
    beginLanguageSwitch();
    void (async () => {
      try {
        await setPreference(value);
        await waitForLocaleUi();
        onSelected?.();
      } finally {
        endLanguageSwitch();
      }
    })();
  };

  return (
    <View>
      {showHeading ? (
        <>
          <Text variant="titleMedium" style={styles.section}>
            {t('language.title')}
          </Text>
          <Text variant="bodySmall" style={styles.helper}>
            {t('language.helper')}
          </Text>
        </>
      ) : (
        <Text variant="bodySmall" style={styles.helperOnly}>
          {t('language.helper')}
        </Text>
      )}
      <RadioButton.Item
        label={t('language.device')}
        value="system"
        status={preference === 'system' ? 'checked' : 'unchecked'}
        onPress={() => applyLanguage('system')}
      />
      {APP_LOCALES.map((locale) => (
        <RadioButton.Item
          key={locale.code}
          label={`${locale.nativeName} (${locale.englishName})`}
          value={locale.code}
          status={preference === locale.code ? 'checked' : 'unchecked'}
          onPress={() => applyLanguage(locale.code)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  helper: {
    marginTop: 4,
    marginBottom: 8,
    color: healthOsTheme.colors.onSurfaceVariant,
  },
  helperOnly: {
    marginBottom: 8,
    color: healthOsTheme.colors.onSurfaceVariant,
  },
});

import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import ColorPicker, {
  BrightnessSlider,
  HueCircular,
  Preview,
  PreviewText,
  SaturationSlider,
} from 'reanimated-color-picker';
import { normalizeHex } from '../colors/colorUtils';
import { healthOsTheme } from '../theme/paperTheme';

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorWheelPicker({ value, onChange }: ColorWheelPickerProps) {
  return (
    <ColorPicker
      value={normalizeHex(value)}
      onChangeJS={(colors) => onChange(normalizeHex(colors.hex))}
      boundedThumb
      thumbSize={20}
      sliderThickness={32}
      style={styles.picker}
    >
      <HueCircular style={styles.wheel} thumbShape="ring" />
      <Text variant="labelMedium" style={styles.sliderLabel}>
        Saturation
      </Text>
      <SaturationSlider style={styles.slider} />
      <Text variant="labelMedium" style={styles.sliderLabel}>
        Brightness
      </Text>
      <BrightnessSlider style={styles.slider} />
      <View style={styles.previewRow}>
        <Preview style={styles.preview} hideInitialColor hideText />
        <PreviewText colorFormat="hex" style={styles.previewHex} />
      </View>
    </ColorPicker>
  );
}

const styles = StyleSheet.create({
  picker: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  wheel: {
    width: 220,
    height: 220,
    marginBottom: 8,
  },
  sliderLabel: {
    alignSelf: 'flex-start',
    color: healthOsTheme.colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 2,
  },
  slider: {
    width: '100%',
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  preview: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewHex: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
    fontSize: 16,
  },
});

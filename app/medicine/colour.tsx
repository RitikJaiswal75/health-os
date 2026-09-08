import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CustomColorDialog } from '@/src/core/components/CustomColorDialog';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { isPresetPillColor } from '@/src/core/colors/colorUtils';
import { PILL_COLORS, supportsDualColor } from '@/src/core/types/domain';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function ColourScreen() {
  const { draft, setAppearance } = useWizardStore();
  const dualColor = supportsDualColor(draft.pillShape);
  const previewColor = draft.pillColor ?? SHAPE_PREVIEW_COLOR;
  const showDualTone = dualColor && draft.pillColor2 != null;
  const [customDialog, setCustomDialog] = useState<{ slot: 1 | 2 } | null>(null);

  const selectColor = (color: string, slot: 1 | 2) => {
    if (slot === 1) {
      setAppearance(draft.pillShape, color, draft.photoUri, dualColor ? draft.pillColor2 : undefined);
    } else if (dualColor) {
      setAppearance(draft.pillShape, draft.pillColor, draft.photoUri, color);
    }
  };

  const isSelected = (color: string | undefined, slot: 1 | 2) => {
    if (!color) return false;
    const current = slot === 1 ? draft.pillColor : draft.pillColor2;
    return current?.toUpperCase() === color.toUpperCase();
  };

  const isCustomSelected = (slot: 1 | 2) => {
    const current = slot === 1 ? draft.pillColor : draft.pillColor2;
    return !!current && !isPresetPillColor(current, PILL_COLORS);
  };

  const renderSwatches = (slot: 1 | 2) => (
    <View style={styles.swatches}>
      {PILL_COLORS.map((color) => (
        <Pressable
          key={`${slot}-${color}`}
          onPress={() => selectColor(color, slot)}
          style={[
            styles.swatch,
            { backgroundColor: color },
            isSelected(color, slot) && styles.swatchSelected,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Colour ${slot} ${color}`}
          accessibilityState={{ selected: isSelected(color, slot) }}
        />
      ))}
      <Pressable
        onPress={() => setCustomDialog({ slot })}
        style={[styles.swatch, styles.customSwatch, isCustomSelected(slot) && styles.swatchSelected]}
        accessibilityRole="button"
        accessibilityLabel={`Custom colour ${slot}`}
        accessibilityState={{ selected: isCustomSelected(slot) }}
      >
        <View style={styles.customSwatchInner}>
          <MaterialCommunityIcons name="palette" size={22} color={healthOsTheme.colors.onSurface} />
        </View>
        {isCustomSelected(slot) && (
          <View
            style={[
              styles.customColorDot,
              {
                backgroundColor: slot === 1 ? draft.pillColor : draft.pillColor2,
              },
            ]}
          />
        )}
      </Pressable>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleMedium">Choose a colour</Text>
      <View style={styles.preview}>
        {draft.pillShape && (
          <PillShapeIcon
            shape={draft.pillShape}
            color={previewColor}
            color2={showDualTone ? draft.pillColor2 : undefined}
            size={80}
          />
        )}
      </View>

      <Text variant="labelLarge" style={styles.sectionLabel}>
        {dualColor ? 'Colour 1' : 'Colour'}
      </Text>
      {renderSwatches(1)}

      {dualColor && (
        <>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Colour 2
          </Text>
          {renderSwatches(2)}
        </>
      )}

      <Button mode="contained" onPress={() => router.push('/medicine/schedule')}>
        Next
      </Button>

      <CustomColorDialog
        visible={customDialog != null}
        title={customDialog?.slot === 2 ? 'Custom colour 2' : 'Custom colour'}
        value={
          customDialog?.slot === 2
            ? draft.pillColor2 ?? draft.pillColor ?? SHAPE_PREVIEW_COLOR
            : draft.pillColor ?? SHAPE_PREVIEW_COLOR
        }
        onDismiss={() => setCustomDialog(null)}
        onConfirm={(hex) => {
          if (customDialog) selectColor(hex, customDialog.slot);
          setCustomDialog(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, backgroundColor: healthOsTheme.colors.background },
  preview: { alignItems: 'center', marginVertical: 16 },
  sectionLabel: { color: healthOsTheme.colors.onSurface, marginTop: 4 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: healthOsTheme.colors.primary,
  },
  customSwatch: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customSwatchInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customColorDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: healthOsTheme.colors.outline,
  },
});

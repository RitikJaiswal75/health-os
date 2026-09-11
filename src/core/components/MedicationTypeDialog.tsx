import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MEDICATION_TYPES, type MedicationType } from '@/src/core/types/domain';
import { healthOsTheme, tokens } from '@/src/core/theme/paperTheme';

interface MedicationTypeDialogProps {
  visible: boolean;
  value?: MedicationType;
  onDismiss: () => void;
  onConfirm: (type: MedicationType) => void;
}

export function MedicationTypeDialog({
  visible,
  value,
  onDismiss,
  onConfirm,
}: MedicationTypeDialogProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [pending, setPending] = useState<MedicationType | undefined>(value);

  const listMaxHeight = Math.min(windowHeight * 0.42, 360);

  useEffect(() => {
    if (visible) {
      setPending(value);
    }
  }, [visible, value]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Medication type
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Choose the form that best matches your medicine.
          </Text>
        </View>

        <Dialog.ScrollArea style={{ maxHeight: listMaxHeight }}>
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {MEDICATION_TYPES.map((type) => {
              const selected = pending === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() => setPending(type.value)}
                  style={[styles.option, selected && styles.optionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={type.label}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {type.label}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={healthOsTheme.colors.primary}
                    />
                  ) : (
                    <View style={styles.optionRadio} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Dialog.ScrollArea>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.footerButton}
            contentStyle={styles.footerButtonContent}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={() => pending && onConfirm(pending)}
            disabled={!pending}
            style={styles.footerButton}
            contentStyle={styles.footerButtonContent}
          >
            Done
          </Button>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    marginHorizontal: tokens.spacing.lg,
    borderRadius: 20,
    backgroundColor: healthOsTheme.colors.surface,
    maxHeight: '80%',
  },
  header: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: healthOsTheme.colors.outline,
  },
  title: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
  },
  subtitle: {
    color: healthOsTheme.colors.onSurfaceVariant,
    marginTop: tokens.spacing.xs,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  option: {
    minHeight: tokens.minTouchTarget + 8,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: {
    backgroundColor: healthOsTheme.colors.background,
    borderWidth: 1,
    borderColor: healthOsTheme.colors.primary,
  },
  optionLabel: {
    flex: 1,
    color: healthOsTheme.colors.onSurface,
    fontSize: 16,
    paddingRight: tokens.spacing.md,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: healthOsTheme.colors.outline,
  },
  footer: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: healthOsTheme.colors.outline,
  },
  footerButton: {
    flex: 1,
    borderRadius: tokens.radius.md,
  },
  footerButtonContent: {
    paddingVertical: tokens.spacing.xs,
  },
});

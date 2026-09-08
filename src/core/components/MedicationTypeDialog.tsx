import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Portal, RadioButton, Text } from 'react-native-paper';
import { MEDICATION_TYPES, type MedicationType } from '@/src/core/types/domain';

const SAMSUNG = {
  dialogBg: '#252525',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  divider: '#3A3A3C',
} as const;

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
  const [pending, setPending] = useState<MedicationType | undefined>(value);

  useEffect(() => {
    if (visible) {
      setPending(value);
    }
  }, [visible, value]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text variant="titleMedium" style={styles.title}>
            Medication type
          </Text>
          <ScrollView style={styles.list} bounces={false}>
            <RadioButton.Group
              onValueChange={(v) => setPending(v as MedicationType)}
              value={pending ?? ''}
            >
              {MEDICATION_TYPES.map((type) => (
                <RadioButton.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                  labelStyle={styles.optionLabel}
                  color={SAMSUNG.text}
                  uncheckedColor={SAMSUNG.textMuted}
                  style={styles.option}
                />
              ))}
            </RadioButton.Group>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              style={styles.footerBtn}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={styles.footerDivider} />
            <Pressable
              style={styles.footerBtn}
              onPress={() => pending && onConfirm(pending)}
              disabled={!pending}
              accessibilityRole="button"
              accessibilityLabel="OK"
            >
              <Text style={[styles.okText, !pending && styles.okTextDisabled]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: SAMSUNG.dialogBg,
    borderRadius: 28,
    overflow: 'hidden',
  },
  title: {
    color: SAMSUNG.text,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  list: {
    maxHeight: 420,
  },
  option: {
    paddingVertical: 2,
  },
  optionLabel: {
    color: SAMSUNG.text,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SAMSUNG.divider,
    marginTop: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: SAMSUNG.divider,
  },
  cancelText: {
    color: SAMSUNG.text,
    fontSize: 16,
    fontWeight: '500',
  },
  okText: {
    color: SAMSUNG.text,
    fontSize: 16,
    fontWeight: '600',
  },
  okTextDisabled: {
    color: SAMSUNG.textMuted,
  },
});

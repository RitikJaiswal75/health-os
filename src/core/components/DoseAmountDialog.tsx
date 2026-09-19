import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Portal, Text, TextInput } from 'react-native-paper';
import {
  formatDoseLabel,
  usesDirectMeasuredDose,
  type MedicationType,
} from '@/src/core/types/domain';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

const theme = healthOsTheme.colors;

interface DoseAmountDialogProps {
  visible: boolean;
  doseIndex: number;
  amount: number;
  medicationType?: MedicationType | string;
  strengthValue?: number;
  strengthUnit?: string;
  doseUnitValue?: number;
  doseUnitUnit?: string;
  onDismiss: () => void;
  onConfirm: (amount: number) => void;
}

function sanitizeWholeNumberInput(value: string): string {
  return value.replace(/\D/g, '');
}

function parseDoseInput(input: string): number {
  const parsed = parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function doseInputLabel(medicationType?: MedicationType | string): string {
  if (medicationType === 'powder') return 'Amount (g)';
  if (medicationType === 'liquid') return 'Amount (ml)';
  return 'How many?';
}

export function DoseAmountDialog({
  visible,
  doseIndex,
  amount,
  medicationType,
  strengthValue,
  strengthUnit,
  doseUnitValue,
  doseUnitUnit,
  onDismiss,
  onConfirm,
}: DoseAmountDialogProps) {
  const directMeasured = usesDirectMeasuredDose(medicationType);
  const [input, setInput] = useState(String(amount));

  useEffect(() => {
    if (visible) {
      setInput(Number.isFinite(amount) ? String(Math.trunc(amount)) : '');
    }
  }, [visible, amount]);

  if (!visible) return null;

  const parsed = parseDoseInput(input);
  const labelOptions = { strengthValue, strengthUnit, doseUnitValue, doseUnitUnit };
  const preview =
    Number.isFinite(parsed) && parsed > 0
      ? formatDoseLabel(parsed, medicationType, labelOptions)
      : null;

  return (
    <Portal>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text variant="titleMedium" style={styles.title}>
            Dose {doseIndex + 1} amount
          </Text>
          {directMeasured ? (
            <Text style={styles.hint}>
              Enter whole {medicationType === 'powder' ? 'grams' : 'millilitres'} to take (no decimals).
            </Text>
          ) : null}
          <TextInput
            label={doseInputLabel(medicationType)}
            value={input}
            onChangeText={(value) => setInput(sanitizeWholeNumberInput(value))}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            accessibilityLabel={`Dose ${doseIndex + 1} ${doseInputLabel(medicationType)}`}
          />
          {preview && <Text style={styles.preview}>{preview}</Text>}
          <View style={styles.footer}>
            <Pressable style={styles.footerBtn} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={styles.footerDivider} />
            <Pressable
              style={styles.footerBtn}
              onPress={() => {
                const next = parseDoseInput(input);
                if (next > 0) onConfirm(next);
              }}
              disabled={!(Number.isFinite(parsed) && parsed > 0)}
              accessibilityRole="button"
              accessibilityLabel="OK"
            >
              <Text style={[styles.okText, !(Number.isFinite(parsed) && parsed > 0) && styles.okTextDisabled]}>
                OK
              </Text>
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
    backgroundColor: theme.surface,
    borderRadius: 28,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  title: {
    color: theme.onSurface,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  hint: {
    color: theme.onSurfaceVariant,
    fontSize: 14,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  input: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  preview: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.outline,
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
    backgroundColor: theme.outline,
  },
  cancelText: {
    color: theme.onSurface,
    fontSize: 16,
    fontWeight: '500',
  },
  okText: {
    color: theme.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  okTextDisabled: {
    color: theme.onSurfaceVariant,
  },
});

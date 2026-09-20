import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Portal, Text, TextInput } from 'react-native-paper';
import {
  formatDoseLabel,
  usesDirectMeasuredDose,
  type MedicationType,
} from '@/src/core/types/domain';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { t } from '@/src/i18n/translate';

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

function doseInputLabel(
  medicationType: MedicationType | string | undefined,
  translate: typeof t,
): string {
  if (medicationType === 'powder') return translate('doseAmount.grams');
  if (medicationType === 'liquid') return translate('doseAmount.ml');
  return translate('doseAmount.howMany');
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
  const { t } = useT();
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
            {t('doseAmount.title', { n: doseIndex + 1 })}
          </Text>
          {directMeasured ? (
            <Text style={styles.hint}>
              {medicationType === 'powder' ? t('doseAmount.hintPowder') : t('doseAmount.hintLiquid')}
            </Text>
          ) : null}
          <TextInput
            label={doseInputLabel(medicationType, t)}
            value={input}
            onChangeText={(value) => setInput(sanitizeWholeNumberInput(value))}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            accessibilityLabel={t('schedule.doseAmount', { n: doseIndex + 1 })}
          />
          {preview && <Text style={styles.preview}>{preview}</Text>}
          <View style={styles.footer}>
            <Pressable style={styles.footerBtn} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
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
              accessibilityLabel={t('common.ok')}
            >
              <Text style={[styles.okText, !(Number.isFinite(parsed) && parsed > 0) && styles.okTextDisabled]}>
                {t('common.ok')}
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

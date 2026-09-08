import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import { TIMES_PER_DAY_OPTIONS } from '@/src/core/types/domain';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

const theme = healthOsTheme.colors;

interface TimeDosageDialogProps {
  visible: boolean;
  timesPerDay: number;
  onDismiss: () => void;
  onConfirm: (count: number) => void;
}

export function TimeDosageDialog({ visible, timesPerDay, onDismiss, onConfirm }: TimeDosageDialogProps) {
  const [pendingCount, setPendingCount] = useState(timesPerDay);
  const [customCount, setCustomCount] = useState(String(timesPerDay || ''));
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (visible) {
      const preset = TIMES_PER_DAY_OPTIONS.some((o) => o.count === timesPerDay && timesPerDay > 0);
      setPendingCount(timesPerDay);
      setCustomCount(String(timesPerDay || ''));
      setShowCustom(!preset && timesPerDay > 0);
    }
  }, [visible, timesPerDay]);

  const confirmCount = (count: number) => {
    if (count > 0) {
      onConfirm(count);
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text variant="titleMedium" style={styles.title}>
            How many times a day?
          </Text>
          <ScrollView style={styles.list} bounces={false}>
            <RadioButton.Group
              onValueChange={(v) => {
                if (v === 'custom') {
                  setShowCustom(true);
                  return;
                }
                confirmCount(parseInt(v, 10));
              }}
              value={
                showCustom || !TIMES_PER_DAY_OPTIONS.some((o) => o.count === pendingCount && pendingCount > 0)
                  ? 'custom'
                  : String(pendingCount)
              }
            >
              {TIMES_PER_DAY_OPTIONS.filter((o) => o.count > 0).map((o) => (
                <RadioButton.Item
                  key={o.count}
                  label={o.label}
                  value={String(o.count)}
                  labelStyle={styles.optionLabel}
                  color={theme.primary}
                  uncheckedColor={theme.onSurfaceVariant}
                  style={styles.option}
                  position="leading"
                />
              ))}
              <RadioButton.Item
                label="Custom"
                value="custom"
                labelStyle={styles.optionLabel}
                color={theme.primary}
                uncheckedColor={theme.onSurfaceVariant}
                style={styles.option}
                position="leading"
              />
            </RadioButton.Group>
            {showCustom && (
              <View style={styles.customRow}>
                <TextInput
                  label="Custom count"
                  value={customCount}
                  onChangeText={setCustomCount}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.customInput}
                  accessibilityLabel="Custom times per day"
                />
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.footerBtn} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            {showCustom && (
              <>
                <View style={styles.footerDivider} />
                <Pressable
                  style={styles.footerBtn}
                  onPress={() => confirmCount(parseInt(customCount, 10))}
                  accessibilityRole="button"
                  accessibilityLabel="OK"
                >
                  <Text style={styles.okText}>OK</Text>
                </Pressable>
              </>
            )}
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
    maxHeight: '70%',
    backgroundColor: theme.surface,
    borderRadius: 28,
    overflow: 'hidden',
  },
  title: {
    color: theme.onSurface,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  list: {
    maxHeight: 360,
    paddingHorizontal: 8,
  },
  option: {
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  optionLabel: {
    color: theme.onSurface,
    textAlign: 'left',
    flexGrow: 0,
  },
  customRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  customInput: {
    backgroundColor: theme.surface,
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
});

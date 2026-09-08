import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import { ColorWheelPicker } from './ColorWheelPicker';
import { normalizeHex } from '../colors/colorUtils';

const SAMSUNG = {
  dialogBg: '#252525',
  text: '#FFFFFF',
  divider: '#3A3A3C',
} as const;

interface CustomColorDialogProps {
  visible: boolean;
  title?: string;
  value?: string;
  onDismiss: () => void;
  onConfirm: (hex: string) => void;
}

export function CustomColorDialog({
  visible,
  title = 'Custom colour',
  value = '#FFFFFF',
  onDismiss,
  onConfirm,
}: CustomColorDialogProps) {
  const [pending, setPending] = useState(normalizeHex(value));

  useEffect(() => {
    if (visible) {
      setPending(normalizeHex(value));
    }
  }, [visible, value]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          <ColorWheelPicker value={pending} onChange={setPending} />
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
              onPress={() => onConfirm(pending)}
              accessibilityRole="button"
              accessibilityLabel="OK"
            >
              <Text style={styles.okText}>OK</Text>
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
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: SAMSUNG.dialogBg,
    borderRadius: 28,
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  title: {
    color: SAMSUNG.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SAMSUNG.divider,
    marginTop: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 16,
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
});

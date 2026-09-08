import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMinutes } from 'date-fns';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { formatLocalDateTime, formatScheduledTime } from '../dates/dateUtils';
import { healthOsTheme } from '../theme/paperTheme';

const QUICK_SNOOZE_MINUTES = [15, 30] as const;

interface SnoozeTimeDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (snoozeUntil: Date) => void;
}

/** Custom clock pick: if time already passed today, assume tomorrow. */
function resolveCustomSnoozeUntil(pickerTime: Date): Date {
  const snoozeUntil = new Date(pickerTime);
  snoozeUntil.setSeconds(0, 0);
  if (snoozeUntil.getTime() <= Date.now()) {
    snoozeUntil.setDate(snoozeUntil.getDate() + 1);
  }
  return snoozeUntil;
}

export function SnoozeTimeDialog({ visible, onDismiss, onConfirm }: SnoozeTimeDialogProps) {
  const [pickerTime, setPickerTime] = useState(() => addMinutes(new Date(), 30));
  const [customMode, setCustomMode] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setPickerTime(addMinutes(new Date(), 30));
      setCustomMode(false);
      setShowAndroidPicker(false);
    }
  }, [visible]);

  const previewTime = resolveCustomSnoozeUntil(pickerTime);

  const handleQuickSnooze = (minutes: number) => {
    onConfirm(addMinutes(new Date(), minutes));
    onDismiss();
  };

  const handleCustomConfirm = () => {
    onConfirm(resolveCustomSnoozeUntil(pickerTime));
    onDismiss();
  };

  const openCustomPicker = () => {
    setCustomMode(true);
    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    }
  };

  const onTimeChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
    }
    if (date) {
      setPickerTime(date);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Snooze until</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.hint}>Choose when you want to be reminded again.</Text>

          <View style={styles.quickRow}>
            {QUICK_SNOOZE_MINUTES.map((minutes) => (
              <Button
                key={minutes}
                mode="outlined"
                compact
                onPress={() => handleQuickSnooze(minutes)}
                style={styles.quickBtn}
              >
                {minutes} min
              </Button>
            ))}
            {!customMode ? (
              <Button mode="outlined" compact onPress={openCustomPicker} style={styles.quickBtn}>
                Custom
              </Button>
            ) : null}
          </View>

          {customMode ? (
            <>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={pickerTime}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={onTimeChange}
                  style={styles.picker}
                />
              ) : showAndroidPicker ? (
                <DateTimePicker
                  value={pickerTime}
                  mode="time"
                  is24Hour
                  display="clock"
                  onChange={onTimeChange}
                />
              ) : (
                <Button
                  mode="outlined"
                  onPress={() => setShowAndroidPicker(true)}
                  icon="clock-outline"
                  style={styles.clockBtn}
                >
                  {formatScheduledTime(formatLocalDateTime(pickerTime))}
                </Button>
              )}

              <Text style={styles.preview}>
                Reminder at {formatScheduledTime(formatLocalDateTime(previewTime))}
              </Text>
            </>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          {customMode ? (
            <Button mode="contained" onPress={handleCustomConfirm}>
              Snooze
            </Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: healthOsTheme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    borderRadius: 999,
  },
  clockBtn: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  picker: {
    alignSelf: 'center',
  },
  preview: {
    marginTop: 12,
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
});

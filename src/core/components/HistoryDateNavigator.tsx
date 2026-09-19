import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { addDays, format, startOfDay } from 'date-fns';
import { Button, IconButton } from 'react-native-paper';
import { clampCalendarDate } from '../dates/dateUtils';
import { DateStrip } from './DateStrip';
import { healthOsTheme, tokens } from '../theme/paperTheme';

interface HistoryDateNavigatorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate: Date;
  maxDate?: Date;
}

export function HistoryDateNavigator({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate = new Date(),
}: HistoryDateNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = startOfDay(maxDate);
  const earliest = startOfDay(minDate);
  const selectedDay = startOfDay(selectedDate);

  const shiftWeek = (deltaWeeks: number) => {
    onSelectDate(clampCalendarDate(addDays(selectedDay, deltaWeeks * 7), earliest, today));
  };

  const canGoBack = selectedDay.getTime() > earliest.getTime();
  const canGoForward = selectedDay.getTime() < today.getTime();

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setPickerOpen(false);
      if (event.type === 'dismissed' || !date) return;
    } else if (event.type === 'dismissed') {
      setPickerOpen(false);
      return;
    }

    if (!date) return;

    onSelectDate(clampCalendarDate(date, earliest, today));
    if (Platform.OS === 'ios' && event.type === 'set') {
      setPickerOpen(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <IconButton
          icon="chevron-left"
          disabled={!canGoBack}
          onPress={() => shiftWeek(-1)}
          accessibilityLabel="Previous week"
        />
        <Button
          mode="text"
          onPress={() => setPickerOpen(true)}
          style={styles.dateButton}
          labelStyle={styles.dateLabel}
          accessibilityLabel={`Selected date ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`}
        >
          {format(selectedDate, 'EEE, d MMM yyyy')}
        </Button>
        <IconButton
          icon="chevron-right"
          disabled={!canGoForward}
          onPress={() => shiftWeek(1)}
          accessibilityLabel="Next week"
        />
      </View>

      <DateStrip selectedDate={selectedDate} onSelectDate={onSelectDate} mode="past" days={7} />

      {pickerOpen && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={earliest}
          maximumDate={today}
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.xs,
  },
  dateButton: {
    flex: 1,
  },
  dateLabel: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
  },
});

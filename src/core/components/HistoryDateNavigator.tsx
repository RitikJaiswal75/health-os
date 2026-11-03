import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, format, startOfDay } from 'date-fns';
import { Button, IconButton } from 'react-native-paper';
import { clampCalendarDate } from '../dates/dateUtils';
import { ScrollableDateStrip, type DateCompletion } from './DateStrip';
import { HistoryCalendarDialog } from './HistoryCalendarDialog';
import { healthOsTheme, tokens } from '../theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { getDateFnsLocale } from '@/src/i18n/dateLocale';

interface HistoryDateNavigatorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate: Date;
  maxDate?: Date;
  completionByDate?: Record<string, DateCompletion>;
}

export function HistoryDateNavigator({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate = new Date(),
  completionByDate,
}: HistoryDateNavigatorProps) {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = startOfDay(maxDate);
  const earliest = startOfDay(minDate);
  const selectedDay = startOfDay(selectedDate);

  const shiftWeek = (deltaWeeks: number) => {
    onSelectDate(clampCalendarDate(addDays(selectedDay, deltaWeeks * 7), earliest, today));
  };

  const canGoBack = selectedDay.getTime() > earliest.getTime();
  const canGoForward = selectedDay.getTime() < today.getTime();

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <IconButton
          icon="chevron-left"
          disabled={!canGoBack}
          onPress={() => shiftWeek(-1)}
          accessibilityLabel={t('history.previousWeek')}
        />
        <Button
          mode="text"
          onPress={() => setPickerOpen(true)}
          style={styles.dateButton}
          labelStyle={styles.dateLabel}
          accessibilityLabel={t('history.selectedDate', {
            date: format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: getDateFnsLocale() }),
          })}
        >
          {format(selectedDate, 'EEE, d MMM yyyy', { locale: getDateFnsLocale() })}
        </Button>
        <IconButton
          icon="chevron-right"
          disabled={!canGoForward}
          onPress={() => shiftWeek(1)}
          accessibilityLabel={t('history.nextWeek')}
        />
      </View>

      <ScrollableDateStrip
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        minDate={earliest}
        maxDate={today}
        completionByDate={completionByDate}
      />

      <HistoryCalendarDialog
        visible={pickerOpen}
        selectedDate={selectedDate}
        minDate={earliest}
        maxDate={today}
        completionByDate={completionByDate}
        onSelectDate={(date) => onSelectDate(clampCalendarDate(date, earliest, today))}
        onDismiss={() => setPickerOpen(false)}
      />
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

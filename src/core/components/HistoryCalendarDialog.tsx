import { createContext, useContext } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { addDays, format, startOfWeek, type Locale } from 'date-fns';
import { formatDateKey, parseDateKey } from '../dates/dateUtils';
import { DateCompletionRing } from './DateCompletionRing';
import type { DateCompletion } from './DateStrip';
import { healthOsTheme } from '../theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { getDateFnsLocale } from '@/src/i18n/dateLocale';

const CELL_SIZE = 36;
const CALENDAR_LOCALE = 'healthos';
// Ring stroke is 3.5; leave a 1.5 gap so the marker never touches the progress arc.
const SELECTED_MARKER_INSET = 5;
// Primary at ~35% opacity: clearly lighter than the ring track, day text stays readable.
const SELECTED_MARKER_COLOR = 'rgba(187, 134, 252, 0.35)';
// Share of window height the month grid may use before it scrolls (landscape phones); portrait fits whole.
const CALENDAR_MAX_HEIGHT_RATIO = 0.65;

type HistoryCalendarDialogProps = {
  visible: boolean;
  selectedDate: Date;
  minDate: Date;
  maxDate: Date;
  completionByDate?: Record<string, DateCompletion>;
  onSelectDate: (date: Date) => void;
  onDismiss: () => void;
};

type DayCellProps = {
  date?: DateData;
  state?: string;
  /** The only marking field used; the library's full type isn't part of its public API. */
  marking?: { selected?: boolean };
  onPress?: (date?: DateData) => void;
};

const CompletionContext = createContext<Record<string, DateCompletion>>({});

let syncedLocale: Locale | null = null;

/**
 * Weekday and month names from the app's date-fns locale, so the grid follows the app language.
 * Runs before the Calendar renders (an effect would be too late for its first paint), and only
 * rewrites the global LocaleConfig when the language actually changes.
 */
function syncCalendarLocale(locale: Locale): void {
  if (locale === syncedLocale) return;
  syncedLocale = locale;
  const sunday = startOfWeek(new Date(), { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1));
  LocaleConfig.locales[CALENDAR_LOCALE] = {
    monthNames: months.map((m) => format(m, 'LLLL', { locale })),
    monthNamesShort: months.map((m) => format(m, 'LLL', { locale })),
    dayNames: days.map((d) => format(d, 'EEEE', { locale })),
    dayNamesShort: days.map((d) => format(d, 'EEEEEE', { locale })),
    today: '',
  };
  LocaleConfig.defaultLocale = CALENDAR_LOCALE;
}

function DayCell({ date, state, marking, onPress }: DayCellProps) {
  const completionByDate = useContext(CompletionContext);
  if (!date) return <View style={styles.cell} />;

  const disabled = state === 'disabled';
  // Selection comes from markedDates; the library only sets state 'selected' inside a CalendarProvider.
  const selected = marking?.selected === true;
  const completion = completionByDate[date.dateString];
  const label = format(parseDateKey(date.dateString), 'EEEE, MMMM d', { locale: getDateFnsLocale() });

  return (
    <Pressable
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
      disabled={disabled}
      onPress={() => onPress?.(date)}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      {!disabled && (
        <View style={styles.ring}>
          <DateCompletionRing
            taken={completion?.taken ?? 0}
            scheduled={completion?.scheduled ?? 0}
            selected={selected}
            size={CELL_SIZE}
          />
          {selected && <View testID="selected-day-marker" style={styles.selectedMarker} />}
        </View>
      )}
      <Text
        variant="bodyMedium"
        style={[styles.day, state === 'today' && styles.today, disabled && styles.disabled]}
      >
        {date.day}
      </Text>
    </Pressable>
  );
}

export function HistoryCalendarDialog({
  visible,
  selectedDate,
  minDate,
  maxDate,
  completionByDate = {},
  onSelectDate,
  onDismiss,
}: HistoryCalendarDialogProps) {
  const { t } = useT();
  const { height: windowHeight } = useWindowDimensions();
  const locale = getDateFnsLocale();
  if (visible) syncCalendarLocale(locale);

  const selectedKey = formatDateKey(selectedDate);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          <ScrollView style={{ maxHeight: windowHeight * CALENDAR_MAX_HEIGHT_RATIO }} bounces={false}>
            <CompletionContext.Provider value={completionByDate}>
              <Calendar
                current={selectedKey}
                minDate={formatDateKey(minDate)}
                maxDate={formatDateKey(maxDate)}
                markedDates={{ [selectedKey]: { selected: true } }}
                firstDay={locale.options?.weekStartsOn ?? 0}
                dayComponent={DayCell}
                disableAllTouchEventsForDisabledDays
                hideExtraDays
                enableSwipeMonths
                onDayPress={(day: DateData) => {
                  onSelectDate(parseDateKey(day.dateString));
                  onDismiss();
                }}
                theme={{
                  calendarBackground: 'transparent',
                  monthTextColor: healthOsTheme.colors.onSurface,
                  textSectionTitleColor: healthOsTheme.colors.onSurfaceVariant,
                  arrowColor: healthOsTheme.colors.primary,
                  disabledArrowColor: healthOsTheme.colors.outline,
                  textMonthFontWeight: '600',
                }}
              />
            </CompletionContext.Provider>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: healthOsTheme.colors.surface,
  },
  content: {
    paddingHorizontal: 8,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Filled disc inside the completion ring, so selection reads whether or not the day has doses.
  selectedMarker: {
    position: 'absolute',
    top: SELECTED_MARKER_INSET,
    left: SELECTED_MARKER_INSET,
    width: CELL_SIZE - 2 * SELECTED_MARKER_INSET,
    height: CELL_SIZE - 2 * SELECTED_MARKER_INSET,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: SELECTED_MARKER_COLOR,
  },
  day: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
  },
  today: {
    color: healthOsTheme.colors.primary,
  },
  disabled: {
    color: healthOsTheme.colors.outline,
    fontWeight: '400',
  },
});

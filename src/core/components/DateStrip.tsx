import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { format, isSameDay } from 'date-fns';
import { getDateStrip, getPastDateStrip, isToday, formatDateKey } from '../../core/dates/dateUtils';
import { DateCompletionRing } from './DateCompletionRing';
import { healthOsTheme, tokens } from '../../core/theme/paperTheme';

export interface DateCompletion {
  taken: number;
  scheduled: number;
}

const DAY_SIZE = 40;

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  days?: number;
  /** centered: today ± days/2 (home). past: last N days through today (history). */
  mode?: 'centered' | 'past';
  completionByDate?: Record<string, DateCompletion>;
}

export function DateStrip({
  selectedDate,
  onSelectDate,
  days = 7,
  mode = 'centered',
  completionByDate = {},
}: DateStripProps) {
  const dates = mode === 'past' ? getPastDateStrip(days) : getDateStrip(days, selectedDate);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {dates.map((date) => {
        const selected = isSameDay(date, selectedDate);
        const today = isToday(date);
        const dateKey = formatDateKey(date);
        const completion = completionByDate[dateKey];
        const scheduled = completion?.scheduled ?? 0;
        const taken = completion?.taken ?? 0;

        return (
          <View key={date.toISOString()} style={styles.chip}>
            <Text variant="labelSmall" style={styles.weekday}>
              {format(date, 'EEE')}
            </Text>
            <Pressable
              onPress={() => onSelectDate(date)}
              hitSlop={6}
              android_disableSound
              style={({ pressed }) => [styles.dayPressable, pressed && styles.dayPressed]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={
                scheduled > 0
                  ? `${format(date, 'EEEE, MMMM d')}, ${taken} of ${scheduled} doses taken`
                  : format(date, 'EEEE, MMMM d')
              }
            >
              <View style={styles.dayWrap} pointerEvents="none">
                <View style={styles.ringBehind}>
                  <DateCompletionRing
                    taken={taken}
                    scheduled={scheduled}
                    selected={selected}
                    size={DAY_SIZE}
                  />
                </View>
                <Text variant="titleMedium" style={[styles.day, today && styles.today]}>
                  {format(date, 'd')}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  weekday: {
    color: healthOsTheme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  dayPressable: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: DAY_SIZE / 2,
  },
  dayPressed: {
    opacity: 0.65,
  },
  dayWrap: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBehind: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DAY_SIZE,
    height: DAY_SIZE,
  },
  day: {
    fontWeight: '600',
    color: healthOsTheme.colors.onSurface,
    zIndex: 1,
  },
  today: {
    color: '#BB86FC',
  },
});

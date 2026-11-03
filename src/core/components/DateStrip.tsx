import { useEffect, useMemo, useRef } from 'react';
import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { addDays, differenceInCalendarDays, format, isSameDay } from 'date-fns';
import { getDateStrip, isToday, formatDateKey, parseDateKey } from '../../core/dates/dateUtils';
import { DateCompletionRing } from './DateCompletionRing';
import { healthOsTheme, tokens } from '../../core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { getDateFnsLocale } from '@/src/i18n/dateLocale';
import type { DateCompletion } from '../types/domain';

export type { DateCompletion };

const DAY_SIZE = 40;
const CHIP_BORDER_WIDTH = 1.5;
const CHIP_WIDTH = DAY_SIZE + CHIP_BORDER_WIDTH * 2;
const SCROLL_ITEM_GAP = 6;
const SCROLL_ITEM_WIDTH = CHIP_WIDTH + SCROLL_ITEM_GAP;
const SCROLL_PADDING = tokens.spacing.md;

function scrollItemOffset(index: number): number {
  return SCROLL_PADDING + SCROLL_ITEM_WIDTH * index;
}

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  days?: number;
  completionByDate?: Record<string, DateCompletion>;
}

export function DateStrip({
  selectedDate,
  onSelectDate,
  days = 7,
  completionByDate = {},
}: DateStripProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {getDateStrip(days, selectedDate).map((date) => (
        <DayChip
          key={date.toISOString()}
          date={date}
          selected={isSameDay(date, selectedDate)}
          completion={completionByDate[formatDateKey(date)]}
          onPress={onSelectDate}
        />
      ))}
    </View>
  );
}

type ScrollableDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
  completionByDate?: Record<string, DateCompletion>;
};

/** Finger-scrollable strip of every day from minDate through maxDate (history). */
export function ScrollableDateStrip({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  completionByDate = {},
}: ScrollableDateStripProps) {
  const listRef = useRef<FlatList<Date>>(null);
  const lastKey = formatDateKey(maxDate);
  const firstKey = formatDateKey(minDate < maxDate ? minDate : maxDate);

  const dates = useMemo(() => {
    const first = parseDateKey(firstKey);
    const count = differenceInCalendarDays(parseDateKey(lastKey), first) + 1;
    return Array.from({ length: count }, (_, i) => addDays(first, i));
  }, [firstKey, lastKey]);

  const selectedIndex = Math.min(
    Math.max(differenceInCalendarDays(selectedDate, dates[0]!), 0),
    dates.length - 1,
  );

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: selectedIndex, viewPosition: 0.5, animated: true });
  }, [selectedIndex, dates.length]);

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={dates}
      keyExtractor={(date) => date.toISOString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      getItemLayout={(_, index) => ({
        length: SCROLL_ITEM_WIDTH,
        offset: scrollItemOffset(index),
        index,
      })}
      extraData={completionByDate}
      initialScrollIndex={selectedIndex}
      onScrollToIndexFailed={({ index }) =>
        listRef.current?.scrollToOffset({ offset: scrollItemOffset(index), animated: false })
      }
      accessibilityRole="tablist"
      renderItem={({ item }) => (
        <View style={styles.scrollItem}>
          <DayChip
            date={item}
            selected={isSameDay(item, selectedDate)}
            completion={completionByDate[formatDateKey(item)]}
            onPress={onSelectDate}
          />
        </View>
      )}
    />
  );
}

type DayChipProps = {
  date: Date;
  selected: boolean;
  completion?: DateCompletion;
  onPress: (date: Date) => void;
};

function DayChip({ date, selected, completion, onPress }: DayChipProps) {
  const { t } = useT();
  const today = isToday(date);
  const scheduled = completion?.scheduled ?? 0;
  const taken = completion?.taken ?? 0;

  return (
    <View style={[styles.chip, selected && styles.chipSelected]}>
      <Text variant="labelSmall" style={[styles.weekday, selected && styles.weekdaySelected]}>
        {format(date, 'EEE', { locale: getDateFnsLocale() })}
      </Text>
      <Pressable
        onPress={() => onPress(date)}
        hitSlop={6}
        android_disableSound
        style={({ pressed }) => [styles.dayPressable, pressed && styles.dayPressed]}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={
          scheduled > 0
            ? t('date.dosesTaken', {
                date: format(date, 'EEEE, MMMM d', { locale: getDateFnsLocale() }),
                taken,
                scheduled,
              })
            : format(date, 'EEEE, MMMM d', { locale: getDateFnsLocale() })
        }
      >
        <View style={styles.dayWrap} pointerEvents="none">
          <View style={styles.ringBehind}>
            <DateCompletionRing taken={taken} scheduled={scheduled} selected={selected} size={DAY_SIZE} />
          </View>
          <Text variant="titleMedium" style={[styles.day, today && styles.today]}>
            {format(date, 'd')}
          </Text>
        </View>
      </Pressable>
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
  scrollContent: {
    paddingHorizontal: SCROLL_PADDING,
    paddingVertical: tokens.spacing.sm,
  },
  scrollItem: {
    width: SCROLL_ITEM_WIDTH,
    alignItems: 'center',
  },
  chip: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    borderRadius: CHIP_WIDTH / 2,
    borderWidth: CHIP_BORDER_WIDTH,
    borderColor: 'transparent',
  },
  // Selected day: filled pill behind weekday + date. Today is marked separately by purple digits.
  chipSelected: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    borderColor: healthOsTheme.colors.onSurfaceVariant,
  },
  weekdaySelected: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '700',
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

import { act, createElement, type ComponentType } from 'react';
import { createRoot, type TestInstance } from 'test-renderer';
import { format, type Locale } from 'date-fns';
import { enIN, hi } from 'date-fns/locale';

let mockLocale: Locale = enIN;
const mockLocaleWrites: string[] = [];

jest.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
}));
jest.mock('react-native-paper', () => {
  const { createElement } = jest.requireActual('react');
  const Dialog = Object.assign((props: object) => createElement('Dialog', props), {
    Content: 'DialogContent',
    Actions: 'DialogActions',
  });
  return { Dialog, Portal: 'Portal', Button: 'Button', Text: 'Text' };
});
jest.mock('react-native-calendars', () => ({
  // Host 'Calendar' element (queried by findCalendar) that also renders the selected day's cell,
  // so DayCell runs inside the dialog's real completion context.
  Calendar: (props: {
    current: string;
    markedDates: Record<string, { selected?: boolean }>;
    dayComponent: ComponentType<object>;
  }) => {
    const { createElement: h } = jest.requireActual('react');
    const [year, month, day] = props.current.split('-').map(Number);
    const date = { dateString: props.current, year, month, day, timestamp: 0 };
    return h(
      'Calendar',
      props,
      h(props.dayComponent, { date, state: '', marking: props.markedDates[props.current] }),
    );
  },
  // Records every locale (re)definition so the test can tell renders from language changes.
  LocaleConfig: {
    defaultLocale: '',
    locales: new Proxy({} as Record<string, unknown>, {
      set(target, key, value) {
        mockLocaleWrites.push(String(key));
        target[String(key)] = value;
        return true;
      },
    }),
  },
}));
jest.mock('@/src/core/components/DateCompletionRing', () => ({
  DateCompletionRing: (props: object) => jest.requireActual('react').createElement('Ring', props),
}));
jest.mock('@/src/core/theme/paperTheme', () => ({ healthOsTheme: { colors: {} } }));
jest.mock('@/src/i18n/useT', () => ({ useT: () => ({ t: (key: string) => key }) }));
jest.mock('@/src/i18n/dateLocale', () => ({ getDateFnsLocale: () => mockLocale }));

// eslint-disable-next-line import/first
import { LocaleConfig } from 'react-native-calendars';
// eslint-disable-next-line import/first
import { HistoryCalendarDialog } from '../src/core/components/HistoryCalendarDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MIN_DATE = new Date(2026, 8, 1);
const MAX_DATE = new Date(2026, 9, 31);

function renderDialog(
  renderer: ReturnType<typeof createRoot>,
  overrides: Partial<Parameters<typeof HistoryCalendarDialog>[0]> = {},
): void {
  act(() => {
    renderer.render(
      <HistoryCalendarDialog
        visible
        selectedDate={new Date(2026, 9, 15)}
        minDate={MIN_DATE}
        maxDate={MAX_DATE}
        onSelectDate={jest.fn()}
        onDismiss={jest.fn()}
        {...overrides}
      />,
    );
  });
}

function findCalendar(container: TestInstance): TestInstance {
  const [calendar] = container.queryAll((node) => node.type === 'Calendar');
  if (!calendar) throw new Error('Calendar not rendered');
  return calendar;
}

function dayData(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return { dateString, year, month, day, timestamp: 0 };
}

describe('HistoryCalendarDialog', () => {
  beforeEach(() => {
    mockLocale = enIN;
  });

  it('does not rewrite the calendar locale when the open dialog re-renders', () => {
    const renderer = createRoot();
    renderDialog(renderer);
    const writesAfterOpen = mockLocaleWrites.length;

    renderDialog(renderer, { selectedDate: new Date(2026, 9, 16) });
    renderDialog(renderer, { selectedDate: new Date(2026, 9, 17) });

    expect(mockLocaleWrites).toHaveLength(writesAfterOpen);
  });

  it('switches month names when the app language changes', () => {
    const renderer = createRoot();
    renderDialog(renderer);

    mockLocale = hi;
    renderDialog(renderer);

    const [config] = Object.values(LocaleConfig.locales) as { monthNames: string[] }[];
    expect(config?.monthNames[0]).toBe(format(new Date(2000, 0, 1), 'LLLL', { locale: hi }));
  });

  it('selects the pressed day and closes', () => {
    const onSelectDate = jest.fn();
    const onDismiss = jest.fn();
    const renderer = createRoot();
    renderDialog(renderer, { onSelectDate, onDismiss });

    act(() => {
      findCalendar(renderer.container).props.onDayPress(dayData('2026-10-03'));
    });

    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 9, 3));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('marks only the selected date as selected', () => {
    const renderer = createRoot();
    renderDialog(renderer);
    expect(findCalendar(renderer.container).props.markedDates).toEqual({
      '2026-10-15': { selected: true },
    });
  });

  it('shows the selected-day marker next to the ring when the day has scheduled doses', () => {
    const renderer = createRoot();
    renderDialog(renderer, { completionByDate: { '2026-10-15': { taken: 1, scheduled: 2 } } });

    const rings = renderer.container.queryAll((node) => node.type === 'Ring');
    const markers = renderer.container.queryAll((node) => node.props.testID === 'selected-day-marker');
    expect(rings).toHaveLength(1);
    expect(rings[0]?.props).toMatchObject({ taken: 1, scheduled: 2, selected: true });
    expect(markers).toHaveLength(1);
  });

  describe('day cell', () => {
    function renderDayCell(props: object): TestInstance {
      const renderer = createRoot();
      renderDialog(renderer);
      const DayCell = findCalendar(renderer.container).props.dayComponent as ComponentType<object>;
      const cellRenderer = createRoot();
      act(() => {
        cellRenderer.render(createElement(DayCell, props));
      });
      const [pressable] = cellRenderer.container.queryAll((node) => node.type === 'Pressable');
      if (!pressable) throw new Error('Pressable not rendered');
      return pressable;
    }

    it('passes the pressed date back to the calendar', () => {
      const onPress = jest.fn();
      const date = dayData('2026-10-05');
      renderDayCell({ date, state: '', onPress }).props.onPress();
      expect(onPress).toHaveBeenCalledWith(date);
    });

    it('disables days outside the history range', () => {
      const cell = renderDayCell({ date: dayData('2026-11-05'), state: 'disabled' });
      expect(cell.props.disabled).toBe(true);
      expect(cell.props.accessibilityState).toEqual({ selected: false, disabled: true });
    });

    it('draws a selected-day marker alongside the ring only for the selected day', () => {
      const markerCount = (marking?: { selected: boolean }) => {
        const cell = renderDayCell({ date: dayData('2026-10-15'), state: '', marking });
        return cell.queryAll((node) => node.props.testID === 'selected-day-marker').length;
      };
      expect(markerCount({ selected: true })).toBe(1);
      expect(markerCount(undefined)).toBe(0);
    });

    it('reports selection from the marking', () => {
      const cell = renderDayCell({
        date: dayData('2026-10-15'),
        state: '',
        marking: { selected: true },
      });
      expect(cell.props.accessibilityState).toEqual({ selected: true, disabled: false });
    });
  });
});

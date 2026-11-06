import { act } from 'react';
import { createRoot, type TestInstance } from 'test-renderer';
import { addDays, startOfDay } from 'date-fns';

const mockList = { scrollToIndex: jest.fn(), scrollToEnd: jest.fn(), scrollToOffset: jest.fn() };

jest.mock('react-native', () => {
  const { createElement, forwardRef, useImperativeHandle } = jest.requireActual('react');
  // Host stand-in that exposes the scroll methods the strip calls through its ref.
  const FlatList = forwardRef((props: object, ref: unknown) => {
    useImperativeHandle(ref, () => mockList);
    return createElement('FlatList', props);
  });
  return {
    FlatList,
    View: 'View',
    Pressable: 'Pressable',
    StyleSheet: { create: <T,>(styles: T) => styles },
  };
});
jest.mock('react-native-paper', () => ({ Text: 'Text' }));
jest.mock('@/src/core/components/DateCompletionRing', () => ({ DateCompletionRing: () => null }));
jest.mock('@/src/core/theme/paperTheme', () => ({
  healthOsTheme: { colors: {} },
  tokens: { spacing: { md: 16, sm: 8 } },
}));
jest.mock('@/src/i18n/useT', () => ({ useT: () => ({ t: (key: string) => key }) }));
jest.mock('@/src/i18n/dateLocale', () => ({ getDateFnsLocale: () => undefined }));

// eslint-disable-next-line import/first
import { ScrollableDateStrip } from '../src/core/components/DateStrip';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function findFlatList(container: TestInstance): TestInstance {
  const [list] = container.queryAll((node) => node.type === 'FlatList');
  if (!list) throw new Error('FlatList not rendered');
  return list;
}

describe('ScrollableDateStrip', () => {
  it('falls back to the failed index, not the end of the list, when scrollToIndex fails', () => {
    const today = startOfDay(new Date());
    const minDate = addDays(today, -30);

    const renderer = createRoot();
    act(() => {
      renderer.render(
        <ScrollableDateStrip
          selectedDate={addDays(minDate, 5)}
          onSelectDate={jest.fn()}
          minDate={minDate}
          maxDate={today}
        />,
      );
    });

    const flatList = findFlatList(renderer.container);
    act(() => {
      flatList.props.onScrollToIndexFailed({
        index: 5,
        highestMeasuredFrameIndex: 0,
        averageItemLength: 48,
      });
    });

    expect(mockList.scrollToEnd).not.toHaveBeenCalled();
    expect(mockList.scrollToOffset).toHaveBeenCalledWith(
      expect.objectContaining({ offset: flatList.props.getItemLayout(null, 5).offset }),
    );
    act(() => renderer.unmount());
  });
});

import { act } from 'react';
import { createRoot } from 'test-renderer';

const mockScreenSetParams = jest.fn();
const mockRouterSetParams = jest.fn();

jest.mock('expo-router', () => ({
  router: { setParams: (...args: unknown[]) => mockRouterSetParams(...args) },
  useNavigation: () => ({ setParams: mockScreenSetParams }),
}));

// eslint-disable-next-line import/first
import { useHighlightAutoClear } from '../src/features/inventory/useHighlightAutoClear';
// eslint-disable-next-line import/first
import { HIGHLIGHT_MEDICATION_PARAM, MEDICATION_HIGHLIGHT_MS } from '../src/features/inventory/constants';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ highlightedId }: { highlightedId: string | null }) {
  useHighlightAutoClear(highlightedId);
  return null;
}

describe('useHighlightAutoClear', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScreenSetParams.mockClear();
    mockRouterSetParams.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("clears the param on the Library screen's own route, not the focused route", () => {
    const renderer = createRoot();
    act(() => {
      renderer.render(<Harness highlightedId="med-1" />);
    });
    // User switches to another tab before the highlight ends; Library stays mounted.
    act(() => {
      jest.advanceTimersByTime(MEDICATION_HIGHLIGHT_MS);
    });

    expect(mockScreenSetParams).toHaveBeenCalledWith({ [HIGHLIGHT_MEDICATION_PARAM]: undefined });
    expect(mockRouterSetParams).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('does nothing without a highlighted medication', () => {
    act(() => {
      createRoot().render(<Harness highlightedId={null} />);
    });
    act(() => {
      jest.advanceTimersByTime(MEDICATION_HIGHLIGHT_MS);
    });
    expect(mockScreenSetParams).not.toHaveBeenCalled();
  });
});

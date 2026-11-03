import { useEffect } from 'react';
import { useNavigation } from 'expo-router';
import { HIGHLIGHT_MEDICATION_PARAM, MEDICATION_HIGHLIGHT_MS } from './constants';

/**
 * End the refill-notification highlight after a delay by clearing the route param.
 * Uses this screen's navigation (not `router`, which targets the focused route) so the
 * param is cleared even if the user has switched tabs in the meantime.
 */
export function useHighlightAutoClear(highlightedId: string | null): void {
  const navigation = useNavigation();

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(
      () => navigation.setParams({ [HIGHLIGHT_MEDICATION_PARAM]: undefined } as never),
      MEDICATION_HIGHLIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [highlightedId, navigation]);
}

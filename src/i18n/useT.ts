import { useMemo } from 'react';
import { t, tCount } from './translate';
import { useLocaleStore } from './localeStore';

/** Re-render when the active locale changes. */
export function useT() {
  const locale = useLocaleStore((state) => state.locale);
  const catalogRevision = useLocaleStore((state) => state.catalogRevision);
  return useMemo(
    () => ({
      t,
      tCount,
      locale,
    }),
    [locale, catalogRevision],
  );
}

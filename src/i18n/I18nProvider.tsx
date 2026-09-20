import { useEffect, type ReactNode } from 'react';
import { useLocaleStore } from './localeStore';

export function I18nProvider({ children }: { children: ReactNode }) {
  const hydrate = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return children;
}

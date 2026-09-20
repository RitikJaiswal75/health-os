import { create } from 'zustand';
import { I18nManager, InteractionManager } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { AppLocale, LocalePreference } from './locales';
import { isAppLocale, resolveAppLocale } from './locales';
import { ensureCatalog, refreshCatalog } from './catalogLoader';
import { setActiveLocale } from './translate';

const STORAGE_KEY = 'health-os-locale-preference';

type LocaleState = {
  preference: LocalePreference;
  locale: AppLocale;
  hydrated: boolean;
  switching: boolean;
  catalogRevision: number;
  setPreference: (preference: LocalePreference) => Promise<void>;
  hydrate: () => Promise<void>;
};

function readDeviceLocale(): AppLocale {
  try {
    // Optional until the native module is linked after prebuild.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as {
      getLocales?: () => { languageTag?: string; languageCode?: string | null }[];
    };
    const locales = Localization.getLocales?.() ?? [];
    const tag = locales[0]?.languageTag ?? locales[0]?.languageCode;
    return resolveAppLocale(tag);
  } catch {
    return 'en';
  }
}

function resolvePreference(preference: LocalePreference): AppLocale {
  return preference === 'system' ? readDeviceLocale() : preference;
}

function applyRtl(locale: AppLocale): void {
  const rtl = locale === 'ur';
  try {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  } catch {
    // Tests and web can omit I18nManager.
  }
}

async function persistPreference(preference: LocalePreference): Promise<void> {
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return;
    await FileSystem.writeAsStringAsync(`${dir}${STORAGE_KEY}.json`, JSON.stringify({ preference }));
  } catch {
    // Persistence is best-effort.
  }
}

async function loadPreference(): Promise<LocalePreference | null> {
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return null;
    const path = `${dir}${STORAGE_KEY}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(path)) as { preference?: string };
    if (parsed.preference === 'system' || (parsed.preference && isAppLocale(parsed.preference))) {
      return parsed.preference as LocalePreference;
    }
    return null;
  } catch {
    return null;
  }
}

function syncLocale(preference: LocalePreference): AppLocale {
  const locale = resolvePreference(preference);
  setActiveLocale(locale);
  applyRtl(locale);
  return locale;
}

/** Let React commit the new locale and paint before hiding the switch overlay. */
async function waitForLocaleUi(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function beginLanguageSwitch(): void {
  useLocaleStore.setState({ switching: true });
}

export function endLanguageSwitch(): void {
  useLocaleStore.setState({ switching: false });
}

export { waitForLocaleUi };

export const useLocaleStore = create<LocaleState>((set, get) => ({
  preference: 'system',
  locale: 'en',
  hydrated: false,
  switching: false,
  catalogRevision: 0,
  setPreference: async (preference) => {
    if (preference === get().preference) return;
    if (!get().switching) {
      set({ switching: true });
    }
    const locale = resolvePreference(preference);
    await ensureCatalog(locale);
    syncLocale(preference);
    set((state) => ({
      preference,
      locale,
      catalogRevision: state.catalogRevision + 1,
    }));
    await persistPreference(preference);
    await waitForLocaleUi();
    void refreshCatalog(locale).then((updated) => {
      if (updated) {
        set((state) => ({ catalogRevision: state.catalogRevision + 1 }));
      }
    });
  },
  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await loadPreference();
    const preference = stored ?? 'system';
    const locale = resolvePreference(preference);
    await ensureCatalog(locale);
    syncLocale(preference);
    set({ preference, locale, hydrated: true, catalogRevision: 1 });
    void refreshCatalog(locale).then((updated) => {
      if (updated) {
        set((state) => ({ catalogRevision: state.catalogRevision + 1 }));
      }
    });
  },
}));

export function getResolvedLocale(): AppLocale {
  return useLocaleStore.getState().locale;
}

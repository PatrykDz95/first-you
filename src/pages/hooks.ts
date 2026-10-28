import { useEffect, useState } from 'preact/hooks';
import type { WxtStorageItem } from 'wxt/utils/storage';
import { settingsItem } from '../settings/storage';
import { DEFAULT_SETTINGS, type Settings } from '../settings/types';
import { i18n, resolveLang } from '../../locales';

/** Current value of a storage item, kept in sync across tabs. null until loaded. */
export function useItem<T>(item: WxtStorageItem<T, Record<string, unknown>>): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    void item.getValue().then(setValue);
    return item.watch((v) => setValue(v));
  }, [item]);
  return value;
}

export function useSettings(): Settings | null {
  const s = useItem(settingsItem);
  return s ? { ...DEFAULT_SETTINGS, ...s } : null;
}

/** i18n bound to the user's language setting; keeps <html lang> in sync. */
export function useI18n(settings: Settings | null) {
  const lang = resolveLang(settings?.language ?? 'auto');
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return i18n(lang);
}

export function formatTime(lang: string, ts: number) {
  return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(ts);
}

export function formatDate(lang: string, ts: number, withWeekday = false) {
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    ...(withWeekday ? { weekday: 'long' } : {}),
  }).format(ts);
}

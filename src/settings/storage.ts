import { storage } from 'wxt/utils/storage';
import type { CustomTrigger } from '../classifier/types';
import { DEFAULT_SETTINGS, type DailyCounter, type Settings } from './types';

/**
 * Settings, custom triggers and the daily counter live in extension storage, not IndexedDB:
 * content scripts must decide synchronously (inside the keydown handler) whether to block a send,
 * so they keep an in-memory copy and watch for changes. IndexedDB in a content script would be the
 * chat site's database, not ours.
 */
export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export const customTriggersItem = storage.defineItem<CustomTrigger[]>('local:customTriggers', {
  fallback: [],
});

export const dailyCounterItem = storage.defineItem<DailyCounter>('local:dailyCounter', {
  fallback: { date: '', shown: 0 },
});

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = { ...DEFAULT_SETTINGS, ...(await settingsItem.getValue()) };
  const next = { ...current, ...patch };
  await settingsItem.setValue(next);
  return next;
}

/** Set by the Sunday 18:00 alarm, cleared when the report page is opened. Drives the "•" badge. */
export const reportReadyItem = storage.defineItem<number | null>('local:reportReady', { fallback: null });

/** Wipes settings, phrases, counters and flags (data in IndexedDB is cleared separately). */
export async function resetStorage(): Promise<void> {
  await Promise.all([
    settingsItem.removeValue(),
    customTriggersItem.removeValue(),
    dailyCounterItem.removeValue(),
    reportReadyItem.removeValue(),
  ]);
}

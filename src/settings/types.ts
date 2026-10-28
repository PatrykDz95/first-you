import type { AutoCategory } from '../classifier/types';

export type LanguagePref = 'auto' | 'pl' | 'en';

export interface Settings {
  onboardingDone: boolean;
  practiceCategories: AutoCategory[];
  dailyLimit: number;
  /** Epoch ms; "I'm in a hurry" pause. null = no pause. */
  pausedUntil: number | null;
  /** Mute key ("email" or "custom:<id>") -> epoch ms when the mute ends. */
  mutedCategories: Record<string, number>;
  language: LanguagePref;
  reportOnly: boolean;
  /** Mute key -> consecutive skips. */
  skipStreaks: Record<string, number>;
}

export const DEFAULT_SETTINGS: Settings = {
  onboardingDone: false,
  practiceCategories: [],
  dailyLimit: 3,
  pausedUntil: null,
  mutedCategories: {},
  language: 'auto',
  reportOnly: false,
  skipStreaks: {},
};

export const DAILY_LIMIT_MIN = 0;
export const DAILY_LIMIT_MAX = 10;

/** Windows shown today. Kept in storage (not IndexedDB) so content scripts can read it synchronously from cache. */
export interface DailyCounter {
  /** Local date, YYYY-MM-DD. */
  date: string;
  shown: number;
}

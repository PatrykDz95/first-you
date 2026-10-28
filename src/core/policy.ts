import type { ClassifyResult } from '../classifier/types';
import type { DailyCounter, Settings } from '../settings/types';
import { DAY, HOUR, localDate } from './time';

export const PAUSE_MS = 2 * HOUR;
export const MUTE_MS = 7 * DAY;
export const SKIPS_TO_MUTE = 3;

/**
 * attempt = own try, original prompt sent, compare afterwards.
 * review  = own try sent to AI together with the prompt, asking for feedback instead of a rewrite.
 */
export type Decision = 'attempt' | 'review' | 'skip' | 'paused' | 'misfire' | 'none';

export type GateReason = 'classifier' | 'report_only' | 'paused' | 'muted' | 'daily_limit' | 'onboarding';

/** Mute/streak key: auto categories by name, custom phrases one by one. */
export function muteKey(r: Pick<ClassifyResult, 'category' | 'customTriggerId'>): string {
  return r.category === 'custom' ? `custom:${r.customTriggerId}` : r.category;
}

export function shownToday(counter: DailyCounter, now: number): number {
  return counter.date === localDate(now) ? counter.shown : 0;
}

/** Pure. User-state gating applied after the classifier. */
export function gateWindow(
  result: ClassifyResult,
  settings: Settings,
  counter: DailyCounter,
  now: number,
): { show: true } | { show: false; reason: GateReason } {
  if (result.taskType === null) return { show: false, reason: 'classifier' };
  if (!settings.onboardingDone) return { show: false, reason: 'onboarding' };
  if (settings.reportOnly) return { show: false, reason: 'report_only' };
  if (settings.pausedUntil !== null && settings.pausedUntil > now) return { show: false, reason: 'paused' };
  const mutedUntil = settings.mutedCategories[muteKey(result)];
  if (mutedUntil !== undefined && mutedUntil > now) return { show: false, reason: 'muted' };
  if (shownToday(counter, now) >= settings.dailyLimit) return { show: false, reason: 'daily_limit' };
  return { show: true };
}

/** Pure. Settings changes caused by a decision in the window. */
export function applyDecision(
  settings: Settings,
  key: string,
  decision: Decision,
  now: number,
): Partial<Settings> {
  switch (decision) {
    case 'attempt':
    case 'review':
      return { skipStreaks: { ...settings.skipStreaks, [key]: 0 } };
    case 'skip': {
      const streak = (settings.skipStreaks[key] ?? 0) + 1;
      if (streak >= SKIPS_TO_MUTE) {
        return {
          skipStreaks: { ...settings.skipStreaks, [key]: 0 },
          mutedCategories: { ...settings.mutedCategories, [key]: now + MUTE_MS },
        };
      }
      return { skipStreaks: { ...settings.skipStreaks, [key]: streak } };
    }
    case 'paused':
      // Not a skip: no streak, no score impact.
      return { pausedUntil: now + PAUSE_MS };
    case 'misfire':
    case 'none':
      return {};
  }
}

export function incrementCounter(counter: DailyCounter, now: number): DailyCounter {
  const date = localDate(now);
  return { date, shown: (counter.date === date ? counter.shown : 0) + 1 };
}

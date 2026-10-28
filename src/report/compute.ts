import type { PromptCategory } from '../classifier/types';
import { TOPICS, type Topic } from '../classifier/topic';
import type { PromptEvent } from '../db/schema';

/**
 * Pure report math. Measures competence and own work, never "how much you gave away".
 * Computed live from events (kept 90 days), so the report is available any day, not only Sunday.
 */
export interface WeekStats {
  from: number;
  to: number;
  prompts: number;
  windows: number;
  tries: number;
  reviews: number;
  compares: number;
  skips: number;
  misfires: number;
  triesByCategory: Partial<Record<PromptCategory, number>>;
  triesByPhrase: Record<string, number>;
  check: { hit: number; close: number; miss: number };
  edit: { little: number; lot: number };
  topics: Record<Topic, number>;
}

export function weekStats(events: readonly PromptEvent[], from: number, to: number): WeekStats {
  const s: WeekStats = {
    from,
    to,
    prompts: 0,
    windows: 0,
    tries: 0,
    reviews: 0,
    compares: 0,
    skips: 0,
    misfires: 0,
    triesByCategory: {},
    triesByPhrase: {},
    check: { hit: 0, close: 0, miss: 0 },
    edit: { little: 0, lot: 0 },
    topics: Object.fromEntries(TOPICS.map((t) => [t, 0])) as Record<Topic, number>,
  };
  for (const e of events) {
    if (e.createdAt < from || e.createdAt >= to) continue;
    s.prompts++;
    s.topics[e.topic ?? 'other']++;
    if (e.shownWindow) s.windows++;
    if (e.decision === 'skip') s.skips++;
    if (e.decision === 'misfire') s.misfires++;
    if (e.decision === 'attempt' || e.decision === 'review') {
      s.tries++;
      if (e.decision === 'review') s.reviews++;
      else s.compares++;
      s.triesByCategory[e.category] = (s.triesByCategory[e.category] ?? 0) + 1;
      if (e.customPhraseId) s.triesByPhrase[e.customPhraseId] = (s.triesByPhrase[e.customPhraseId] ?? 0) + 1;
    }
    switch (e.outcome) {
      case 'hit':
        s.check.hit++;
        break;
      case 'close':
        s.check.close++;
        break;
      case 'miss':
        s.check.miss++;
        break;
      case 'ai_little':
        s.edit.little++;
        break;
      case 'ai_lot':
        s.edit.lot++;
        break;
    }
  }
  return s;
}

export const MIN_RATED = 3;

export type Highlight =
  | { kind: 'tries'; value: number; delta: number | null }
  | { kind: 'check'; hit: number; close: number; total: number }
  | { kind: 'edit'; little: number; total: number };

export function topCategory(s: WeekStats): { category: PromptCategory; count: number } | null {
  const entries = Object.entries(s.triesByCategory) as [PromptCategory, number][];
  if (entries.length === 0) return null;
  const [category, count] = entries.sort((a, b) => b[1] - a[1])[0]!;
  return { category, count };
}

/** Main view: at most 3 numbers, only those backed by enough data. */
export function highlights(cur: WeekStats, prev: WeekStats | null): Highlight[] {
  const out: Highlight[] = [];
  if (cur.tries > 0) out.push({ kind: 'tries', value: cur.tries, delta: prev ? cur.tries - prev.tries : null });
  const checkTotal = cur.check.hit + cur.check.close + cur.check.miss;
  if (checkTotal >= MIN_RATED) out.push({ kind: 'check', hit: cur.check.hit, close: cur.check.close, total: checkTotal });
  const editTotal = cur.edit.little + cur.edit.lot;
  if (editTotal >= MIN_RATED) out.push({ kind: 'edit', little: cur.edit.little, total: editTotal });
  // The most-practised category goes into the summary sentence, not a tile (no repeating).
  return out.slice(0, 3);
}

export type SummaryKey = 'quiet' | 'watching' | 'noTries' | 'sharp' | 'up' | 'steady';

/** One sentence, always neutral or positive; a weaker week gets a small next step, never blame. */
export function summaryKey(cur: WeekStats, prev: WeekStats | null): SummaryKey {
  if (cur.prompts === 0) return 'quiet';
  if (cur.tries === 0) return cur.windows > 0 ? 'noTries' : 'watching';
  const checkTotal = cur.check.hit + cur.check.close + cur.check.miss;
  if (checkTotal >= MIN_RATED && cur.check.hit / checkTotal >= 0.7) return 'sharp';
  if (prev && cur.tries > prev.tries) return 'up';
  return 'steady';
}

/** Mirror: share of all prompts per loose topic, largest first, zeros dropped. */
export function mirror(s: WeekStats): { topic: Topic; count: number; share: number }[] {
  if (s.prompts === 0) return [];
  return (Object.entries(s.topics) as [Topic, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count, share: count / s.prompts }));
}

/** Voluntary anonymous numbers: counts only, no text, no phrases, no timestamps beyond the week. */
export function anonymousNumbers(s: WeekStats, weekLabel: string, version: string) {
  return {
    v: 1,
    app: version,
    week: weekLabel,
    prompts: s.prompts,
    windows: s.windows,
    tries: s.tries,
    reviews: s.reviews,
    compares: s.compares,
    skips: s.skips,
    misfires: s.misfires,
    triesByCategory: s.triesByCategory,
    check: s.check,
    edit: s.edit,
    topics: s.topics,
  };
}

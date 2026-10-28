import Dexie, { type EntityTable } from 'dexie';
import type { PromptCategory, TaskType } from '../classifier/types';
import type { Topic } from '../classifier/topic';
import type { Decision } from '../core/policy';

export type SiteId = 'chatgpt' | 'claude' | 'gemini' | 'playground';

/**
 * Self-check after the AI answer. Measures competence, not compliance:
 * estimate / guess / hypothesize -> hit | close | miss; everything else -> ai_little | ai_lot.
 */
export type Outcome = 'hit' | 'close' | 'miss' | 'ai_little' | 'ai_lot';

/** One per prompt sent from the main chat input. Never contains prompt text. Kept 90 days. */
export interface PromptEvent {
  id: number;
  createdAt: number;
  site: SiteId;
  /** Strict category (decides about the window). */
  category: PromptCategory;
  /** Loose topic, for the report's mirror only. */
  topic: Topic;
  /** Which custom phrase fired (the user's own phrase id, not prompt content). */
  customPhraseId?: string;
  wordCount: number;
  inConversation: boolean;
  shownWindow: boolean;
  decision: Decision;
  /** Micro-task offered, when the window was shown. */
  taskType?: TaskType;
  outcome?: Outcome;
}

/** The user's own try (text). Auto-deleted after 30 days; stats never depend on it. */
export interface Attempt {
  id: number;
  promptEventId: number;
  text: string;
  createdAt: number;
  deleteAfter: number;
}

/**
 * Lives in the extension origin. Only the background service worker and extension pages touch it;
 * content scripts go through messaging (their IndexedDB would be the chat site's).
 */
export const db = new Dexie('first-you') as Dexie & {
  promptEvents: EntityTable<PromptEvent, 'id'>;
  attempts: EntityTable<Attempt, 'id'>;
};

db.version(1).stores({
  promptEvents: '++id, createdAt, category, decision',
  attempts: '++id, promptEventId, createdAt, deleteAfter',
  weeklyReports: 'weekStart',
});
// v2: report is computed live from events; outcome/taskType/topic live on the event.
db.version(2).stores({
  promptEvents: '++id, createdAt, category, decision',
  attempts: '++id, promptEventId, createdAt, deleteAfter',
  weeklyReports: null,
});

/** Categories detected automatically by rules. */
export const AUTO_CATEGORIES = ['email', 'math', 'fact', 'summary', 'decision', 'debug'] as const;
export type AutoCategory = (typeof AUTO_CATEGORIES)[number];

/** Category recorded on a PromptEvent. */
export type PromptCategory = AutoCategory | 'custom' | 'other';

/** Micro-task shown in the "First you" window. */
export type TaskType = 'write' | 'estimate' | 'guess' | 'summarize' | 'decide' | 'hypothesize' | 'general';

export const CATEGORY_TASK: Record<AutoCategory, TaskType> = {
  email: 'write',
  math: 'estimate',
  fact: 'guess',
  summary: 'summarize',
  decision: 'decide',
  debug: 'hypothesize',
};

export interface CustomTrigger {
  id: string;
  phrase: string;
  /** Lowercase, no Polish diacritics, single spaces. See normalize(). */
  normalized: string;
  taskType: TaskType;
  createdAt: number;
}

export interface ClassifyInput {
  text: string;
  hasAttachments: boolean;
  practiceCategories: readonly AutoCategory[];
  customTriggers: readonly CustomTrigger[];
  /** true = earlier user message in thread; null = adapter can't tell (treated as true). */
  ongoing: boolean | null;
}

export type NoWindowReason =
  | 'no_match'
  | 'not_selected'
  | 'too_long'
  | 'has_code'
  | 'has_attachments'
  | 'ongoing_short'
  | 'ongoing_reference';

export interface ClassifyResult {
  /** What we record. Detected even when no window is offered. */
  category: PromptCategory;
  customTriggerId?: string;
  /** Non-null = the classifier wants to offer the window (gating happens later). */
  taskType: TaskType | null;
  reason?: NoWindowReason;
  wordCount: number;
}

import type { CustomTrigger, TaskType } from './types';
import { containsTokenRun, normalize, tokenize } from './normalize';

export const MAX_CUSTOM_TRIGGERS = 50;
export const MAX_PHRASE_LENGTH = 60;

export type TriggerError = 'empty' | 'too_long' | 'too_many' | 'duplicate';

export function validateTrigger(phrase: string, existing: readonly CustomTrigger[]): TriggerError | null {
  const trimmed = phrase.trim();
  if (tokenize(normalize(trimmed)).length === 0) return 'empty';
  if (trimmed.length > MAX_PHRASE_LENGTH) return 'too_long';
  if (existing.length >= MAX_CUSTOM_TRIGGERS) return 'too_many';
  const norm = normalizeTrigger(trimmed);
  if (existing.some((t) => t.normalized === norm)) return 'duplicate';
  return null;
}

export function normalizeTrigger(phrase: string): string {
  return tokenize(normalize(phrase)).join(' ');
}

export function createTrigger(phrase: string, taskType: TaskType, now = Date.now()): CustomTrigger {
  return {
    id: `ct_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    phrase: phrase.trim(),
    normalized: normalizeTrigger(phrase),
    taskType,
    createdAt: now,
  };
}

/** First trigger whose words appear, in order and adjacent, in the prompt. Case/diacritics-insensitive. */
export function matchCustomTrigger(
  normalizedPrompt: string,
  triggers: readonly CustomTrigger[],
): CustomTrigger | null {
  if (triggers.length === 0) return null;
  const tokens = tokenize(normalizedPrompt);
  return triggers.find((t) => containsTokenRun(tokens, t.normalized.split(' '))) ?? null;
}

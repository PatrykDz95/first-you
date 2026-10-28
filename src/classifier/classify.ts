import { CATEGORY_TASK, type ClassifyInput, type ClassifyResult } from './types';
import { countWords, normalize } from './normalize';
import { detectCategory, hasCode, hasReference } from './rules';
import { matchCustomTrigger } from './customTriggers';

export const MAX_WORDS = 400;
export const ONGOING_MIN_WORDS = 12;

/**
 * Pure function. Decides whether the prompt deserves a "First you" window,
 * before any user-state gating (limits, pause, mute) — see core/policy.ts.
 */
export function classify(input: ClassifyInput): ClassifyResult {
  const { text, hasAttachments, practiceCategories, customTriggers, ongoing } = input;
  const wordCount = countWords(text);
  const normalized = normalize(text);

  const custom = matchCustomTrigger(normalized, customTriggers);
  const detected = detectCategory(text, normalized);

  const base = custom
    ? { category: 'custom' as const, customTriggerId: custom.id, wordCount }
    : { category: detected ?? ('other' as const), wordCount };
  const none = (reason: ClassifyResult['reason']): ClassifyResult => ({ ...base, taskType: null, reason });

  if (wordCount > MAX_WORDS) return none('too_long');
  // Debug is the one category that lives on code: errors and stack traces often come in code blocks.
  if (hasCode(text) && detected !== 'debug') return none('has_code');
  if (hasAttachments) return none('has_attachments');

  // A custom phrase is explicit consent: works even mid-conversation and for unselected categories.
  if (custom) return { ...base, taskType: custom.taskType };

  if (!detected) return none('no_match');
  if (!practiceCategories.includes(detected)) return none('not_selected');

  // Unknown (null) is treated as ongoing: better not to interrupt than to interrupt for nothing.
  if (ongoing !== false) {
    if (wordCount < ONGOING_MIN_WORDS) return none('ongoing_short');
    if (hasReference(text)) return none('ongoing_reference');
  }

  return { ...base, taskType: CATEGORY_TASK[detected] };
}

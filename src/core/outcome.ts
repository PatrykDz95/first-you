import type { TaskType } from '../classifier/types';
import type { Outcome } from '../db/schema';

/** check = there is a right answer to compare with; edit = how much the AI had to fix. */
export type OutcomeGroup = 'check' | 'edit';

export function outcomeGroup(task: TaskType): OutcomeGroup {
  return task === 'estimate' || task === 'guess' || task === 'hypothesize' ? 'check' : 'edit';
}

export const OUTCOMES: Record<OutcomeGroup, Outcome[]> = {
  check: ['hit', 'close', 'miss'],
  edit: ['ai_little', 'ai_lot'],
};

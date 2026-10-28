import { db, type Outcome, type PromptEvent } from './schema';
import { DAY } from '../core/time';

export const ATTEMPT_TTL_MS = 30 * DAY;
export const EVENT_TTL_MS = 90 * DAY;

export async function recordPrompt(event: Omit<PromptEvent, 'id'>, attemptText?: string): Promise<number> {
  return db.transaction('rw', db.promptEvents, db.attempts, async () => {
    const id = await db.promptEvents.add(event as PromptEvent);
    if (attemptText && (event.decision === 'attempt' || event.decision === 'review')) {
      await db.attempts.add({
        promptEventId: id,
        text: attemptText,
        createdAt: event.createdAt,
        deleteAfter: event.createdAt + ATTEMPT_TTL_MS,
      } as never);
    }
    return id;
  });
}

export async function setOutcome(promptEventId: number, outcome: Outcome | null): Promise<void> {
  await db.promptEvents.update(promptEventId, { outcome: outcome ?? undefined });
}

export function eventsBetween(from: number, to: number): Promise<PromptEvent[]> {
  return db.promptEvents.where('createdAt').between(from, to, true, false).toArray();
}

export async function cleanup(now = Date.now()): Promise<{ attempts: number; events: number }> {
  const attempts = await db.attempts.where('deleteAfter').below(now).delete();
  const events = await db.promptEvents.where('createdAt').below(now - EVENT_TTL_MS).delete();
  return { attempts, events };
}

export async function exportData() {
  return { promptEvents: await db.promptEvents.toArray(), attempts: await db.attempts.toArray() };
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.promptEvents, db.attempts, async () => {
    await db.promptEvents.clear();
    await db.attempts.clear();
  });
}

/** Own tries (attempt or review) since local midnight. */
export async function triesSince(from: number): Promise<number> {
  return db.promptEvents
    .where('createdAt')
    .aboveOrEqual(from)
    .filter((e) => e.decision === 'attempt' || e.decision === 'review')
    .count();
}

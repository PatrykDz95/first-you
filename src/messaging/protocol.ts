import { browser } from 'wxt/browser';
import type { Outcome, PromptEvent } from '../db/schema';

/** Content scripts -> background. Everything stays inside the extension; no network. */
export interface Protocol {
  recordPrompt: { req: { event: Omit<PromptEvent, 'id'>; attemptText?: string }; res: { id: number } };
  setOutcome: { req: { id: number; outcome: Outcome | null }; res: { ok: true } };
}

export type MessageType = keyof Protocol;
export type Envelope<T extends MessageType = MessageType> = { type: T; payload: Protocol[T]['req'] };

export async function send<T extends MessageType>(type: T, payload: Protocol[T]['req']): Promise<Protocol[T]['res']> {
  const res = await browser.runtime.sendMessage({ type, payload } satisfies Envelope<T>);
  if (res && typeof res === 'object' && 'error' in res) throw new Error(String((res as { error: unknown }).error));
  return res as Protocol[T]['res'];
}

type Handlers = { [T in MessageType]: (payload: Protocol[T]['req']) => Promise<Protocol[T]['res']> };

export function listen(handlers: Handlers): void {
  browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
    const env = msg as Envelope;
    const handler = env && handlers[env.type];
    if (!handler) return false;
    handler(env.payload as never)
      .then(sendResponse)
      .catch((e: unknown) => sendResponse({ error: e instanceof Error ? e.message : String(e) }));
    return true; // async response
  });
}

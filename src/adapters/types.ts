import type { SiteId } from '../db/schema';

export interface SiteAdapter {
  id: SiteId;
  matches: string[];
  /** false = selectors not filled in yet; the extension stays off on this site. */
  isConfigured(): boolean;
  /** Main prompt field (textarea or contenteditable). Never an edit-message field. */
  getInput(): HTMLElement | null;
  getPromptText(): string;
  hasAttachments(): boolean;
  /** true = earlier user message in this thread; null = unknown (treated as true). */
  isOngoingConversation(): boolean | null;
  /** Enter and the Send button of the MAIN input only, capture phase. Returns a detach function. */
  interceptSend(handler: (e: Event) => void): () => void;
  /** Sends whatever is in the main input, bypassing interception. */
  submitOriginal(): void;
  /**
   * Replaces the main input's content the way a user edit would (so the site's editor state
   * follows). Only used for review mode, after an explicit click. Returns false if it didn't stick.
   */
  setPromptText(text: string): Promise<boolean>;
}

/**
 * All DOM knowledge about a site. Fill in from the site's CURRENT HTML, never from memory.
 * null = unknown; the feature that needs it stays off.
 */
export interface SiteSelectors {
  /** Main composer. Must not match fields used to edit earlier messages. */
  input: string | null;
  /** Send button of the main composer. Must not match regenerate / continue / voice buttons. */
  sendButton: string | null;
  /** Anything inside the composer that means a file or image is attached. */
  attachment: string | null;
  /** A user message already in the thread (decides "ongoing conversation"). */
  userMessage: string | null;
  /**
   * Input/send matches inside this ancestor are ignored (e.g. the inline editor used to edit an
   * earlier message, which may reuse the composer markup).
   */
  excludeWithin?: string | null;
}

import { createDomAdapter } from './dom';
import type { SiteSelectors } from './types';

/**
 * Claude (claude.ai). Selectors from a live DOM capture on 2026-10-28 (EN UI, logged in).
 * Prefer data-testid / data-cds attributes; class names are utility soup.
 *
 * Notes from that capture:
 * - The composer is a TipTap/ProseMirror contenteditable; there is no <form>.
 * - Send is a type="button" with data-testid="chat-input-send"; the voice button is separate.
 * - Editing an earlier message uses a <textarea aria-label="Edit message"> inside the transcript row.
 * - Attached files show as tiles with [data-cds-attachment] inside [data-cds-composer-attachments]
 *   (second capture, same day). Sent messages reuse MessageAttachments, so scope to the composer.
 */
export const CLAUDE_SELECTORS: SiteSelectors = {
  input: '[data-testid="chat-input"][contenteditable="true"]',
  sendButton: 'button[data-testid="chat-input-send"]',
  attachment: '[data-cds-composer-attachments] [data-cds-attachment]',
  userMessage: '[data-cds="UserMessage"], [data-testid="transcript-row"][data-perf-row="human"]',
  excludeWithin: '[data-testid="transcript-row"]',
};

export const claudeAdapter = createDomAdapter('claude', ['https://claude.ai/*'], CLAUDE_SELECTORS);

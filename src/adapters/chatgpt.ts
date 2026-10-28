import { createDomAdapter } from './dom';
import type { SiteSelectors } from './types';

/**
 * ChatGPT (chatgpt.com). Selectors taken from the live page DOM captured on 2026-10-27
 * (Polish UI, logged in). Prefer data-* attributes; ChatGPT's class names are hashed.
 *
 * Notes from that capture:
 * - Inactive pages stay in the DOM under display:none, with their own composer and messages.
 *   createDomAdapter only ever uses visible matches.
 * - With an empty prompt the primary button becomes "voice" (type=button), while streaming it
 *   becomes "stop" (type=button). Only the real send button is type=submit.
 */
const COMPOSER = 'form[data-chatgpt-composer]';

export const CHATGPT_SELECTORS: SiteSelectors = {
  input: `${COMPOSER} [data-composer-input] [contenteditable="true"]`,
  sendButton: `${COMPOSER} button[type="submit"]`,
  attachment: `${COMPOSER} [data-composer-attachments]:not([hidden]) .composer-attachment-surface`,
  userMessage: '[data-user-message-bubble="true"]',
  // Edit-message editors live inside conversation turns; never treat them as the main input.
  excludeWithin: '[data-turn-key]',
};

export const chatgptAdapter = createDomAdapter('chatgpt', ['https://chatgpt.com/*'], CHATGPT_SELECTORS);

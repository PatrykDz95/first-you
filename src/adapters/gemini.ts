import { createDomAdapter } from './dom';
import type { SiteSelectors } from './types';

/**
 * Gemini (gemini.google.com). Selectors from a live DOM capture on 2026-10-28 (PL UI, logged in).
 * Angular custom element names and data-test-id are the stable hooks; classes like `ng-tns-c…` are not.
 *
 * Notes from that capture:
 * - The prompt is a Quill editor (`.ql-editor`); its sibling `.ql-clipboard` is also contenteditable
 *   and must never be treated as the input.
 * - The send <button> sits inside <gem-icon-button class="send-button submit">. Requiring `.submit`
 *   keeps us off the same slot when it turns into something else (e.g. stop); Enter is still caught.
 * - Attachments render as <uploader-file-preview> inside the input fieldset.
 * - Everything inside <user-query> (including its edit box) is ignored.
 */
const COMPOSER = 'fieldset.input-area-fieldset';

export const GEMINI_SELECTORS: SiteSelectors = {
  input: `${COMPOSER} rich-textarea .ql-editor[contenteditable="true"]`,
  sendButton: `${COMPOSER} [data-test-id="send-button-container"] gem-icon-button.send-button.submit button`,
  attachment: `${COMPOSER} uploader-file-preview`,
  userMessage: 'user-query',
  excludeWithin: 'user-query',
};

export const geminiAdapter = createDomAdapter('gemini', ['https://gemini.google.com/*'], GEMINI_SELECTORS);

import type { SiteId } from '../db/schema';
import type { SiteAdapter, SiteSelectors } from './types';

/** Rendered (not inside display:none). Chat apps keep inactive pages and panels in the DOM. */
const isVisible = (el: Element) => el.getClientRects().length > 0;

/**
 * Generic, selector-driven adapter. Site files supply selectors (and overrides when a site
 * needs special handling); nothing here knows about any particular chat site.
 */
export function createDomAdapter(
  id: SiteId,
  matches: string[],
  sel: SiteSelectors,
  overrides: Partial<SiteAdapter> = {},
): SiteAdapter {
  const allowed = (el: Element) => !sel.excludeWithin || !el.closest(sel.excludeWithin);

  /** First visible match outside excluded areas. */
  const q = <T extends HTMLElement = HTMLElement>(s: string | null, opts: { exclude?: boolean } = {}) => {
    if (!s) return null;
    for (const el of document.querySelectorAll<T>(s)) {
      if (isVisible(el) && (!opts.exclude || allowed(el))) return el;
    }
    return null;
  };
  const countVisible = (s: string) => [...document.querySelectorAll(s)].filter(isVisible).length;

  const getInput = () => q(sel.input, { exclude: true });

  const adapter: SiteAdapter = {
    id,
    matches,

    isConfigured: () => !!sel.input && !!sel.sendButton,

    getInput,

    getPromptText() {
      const el = getInput();
      if (!el) return '';
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
      return el.innerText;
    },

    hasAttachments: () => !!q(sel.attachment),

    isOngoingConversation() {
      if (!sel.userMessage) return null;
      return countVisible(sel.userMessage) > 0;
    },

    interceptSend(handler) {
      const isInMainInput = (target: EventTarget | null) => {
        const input = getInput();
        return !!input && target instanceof Node && (input === target || input.contains(target));
      };

      const onKeyDown = (e: KeyboardEvent) => {
        // Our own synthetic events (submitOriginal) are untrusted: let them through.
        if (!e.isTrusted || e.key !== 'Enter' || e.isComposing) return;
        if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return; // Shift+Enter = newline
        if (!isInMainInput(e.target)) return;
        handler(e);
      };

      const onClick = (e: MouseEvent) => {
        if (!e.isTrusted || !sel.sendButton || !(e.target instanceof Element)) return;
        const button = e.target.closest(sel.sendButton);
        if (!button || !allowed(button)) return;
        handler(e);
      };

      // Window + capture: runs before any page listener on document or the input itself.
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('click', onClick, true);
      return () => {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('click', onClick, true);
      };
    },

    submitOriginal() {
      const button = q<HTMLButtonElement>(sel.sendButton, { exclude: true });
      if (button && !button.disabled) {
        button.click(); // untrusted -> not intercepted
        return;
      }
      const input = getInput();
      input?.focus();
      input?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }),
      );
    },

    async setPromptText(text) {
      const input = getInput();
      if (!input) return false;
      input.focus();
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        input.select();
      } else {
        const range = document.createRange();
        range.selectNodeContents(input);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      // execCommand is deprecated but still the only way to edit that rich editors (ProseMirror,
      // React-controlled fields) treat as real user input: it fires beforeinput/input.
      document.execCommand('insertText', false, text);
      // Let the site's editor/framework pick up the change before anything submits it.
      await new Promise((r) => setTimeout(r, 60));
      const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
      return norm(adapter.getPromptText()) === norm(text);
    },

  };

  return { ...adapter, ...overrides };
}

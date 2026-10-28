import { h, render } from 'preact';
import css from './modal.css?inline';
import { FirstYouModal, type FirstYouModalProps, type ModalDecision } from './FirstYouModal';
import { createShadowHost } from './shadow';

export interface ModalResult {
  decision: ModalDecision;
  attemptText?: string;
}

const FOCUSABLE = 'textarea, button:not([disabled])';

/**
 * Mounts the "First you" dialog in a closed Shadow DOM (page CSS can't reach it, page JS can't read
 * the attempt). Resolves once, with the user's decision.
 */
export function openFirstYouModal(props: Omit<FirstYouModalProps, 'onDecision'>): Promise<ModalResult> {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const { shadow, container, remove } = createShadowHost('first-you-modal', css);

    const textarea = () => shadow.querySelector<HTMLTextAreaElement>('[data-attempt]');
    let done = false;

    const finish = (decision: ModalDecision) => {
      if (done) return;
      done = true;
      const needsText = decision === 'attempt' || decision === 'review';
      const attemptText = needsText ? textarea()?.value.trim() : undefined;
      if (needsText && !attemptText) {
        done = false;
        return;
      }
      for (const type of KEY_EVENTS) window.removeEventListener(type, guard, true);
      render(null, container);
      remove();
      previousFocus?.focus?.();
      resolve({ decision, attemptText });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish('skip');
      } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && shadow.activeElement === textarea()) {
        e.preventDefault();
        finish(props.primary);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const items = [...shadow.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const i = items.indexOf(shadow.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
        items[next]?.focus();
      }
    };

    /**
     * Chat sites listen for keys on window/document (e.g. "type anywhere to focus the prompt").
     * While the dialog is open we take every key event first and stop it there. stopPropagation
     * doesn't cancel the default action, so typing in the textarea and Enter on buttons still work.
     */
    const KEY_EVENTS = ['keydown', 'keypress', 'keyup'] as const;
    function guard(e: Event) {
      if (e.type === 'keydown') onKeyDown(e as KeyboardEvent);
      e.stopImmediatePropagation();
    }
    for (const type of KEY_EVENTS) window.addEventListener(type, guard, true);

    render(h(FirstYouModal, { ...props, onDecision: finish }), container);
    queueMicrotask(() => textarea()?.focus());
  });
}

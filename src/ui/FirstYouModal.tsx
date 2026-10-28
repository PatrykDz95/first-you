import { useState } from 'preact/hooks';
import type { TaskType } from '../classifier/types';
import type { MessageKey } from '../../locales';

export type ModalDecision = 'review' | 'attempt' | 'skip' | 'paused' | 'misfire';

export interface FirstYouModalProps {
  t: (key: MessageKey) => string;
  taskType: TaskType;
  /** Green button, also what Enter does. The other "send my try" option stays secondary. */
  primary: 'review' | 'attempt';
  onDecision: (decision: ModalDecision) => void;
}

/**
 * Keyboard (Esc, Enter, Tab trap) is handled in mount.ts at window-capture level, because chat
 * sites listen to keys globally and would otherwise steal them from this dialog.
 * No timer, on purpose: it must not feel like a test.
 */
export function FirstYouModal({ t, taskType, primary, onDecision }: FirstYouModalProps) {
  const [text, setText] = useState('');
  const empty = !text.trim();
  const secondary = primary === 'review' ? 'attempt' : 'review';
  const label = (d: 'review' | 'attempt') => t(d === 'review' ? 'modal.review' : 'modal.attempt');

  return (
    <div class="root">
      <div class="backdrop">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cm-title" aria-describedby="cm-task">
          <h2 id="cm-title">{t('modal.title')}</h2>
          <p id="cm-task" class="task">
            {t(`task.${taskType}`)}
          </p>
          <textarea
            data-attempt
            aria-label={t(`task.${taskType}`)}
            placeholder={t('modal.placeholder')}
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
          />
          <div class="actions">
            <button class="primary" data-action={primary} disabled={empty} onClick={() => onDecision(primary)}>
              {label(primary)}
            </button>
            <button data-action={secondary} disabled={empty} onClick={() => onDecision(secondary)}>
              {label(secondary)}
            </button>
            <button data-action="skip" onClick={() => onDecision('skip')}>
              {t('modal.skip')}
            </button>
          </div>
          <div class="footer">
            <span class="links">
              <button class="link" data-action="paused" onClick={() => onDecision('paused')}>
                {t('modal.hurry')}
              </button>
              <button class="link" data-action="misfire" onClick={() => onDecision('misfire')}>
                {t('modal.misfire')}
              </button>
            </span>
            <span class="hint">{t('modal.hint')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

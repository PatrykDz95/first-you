import { useState } from 'preact/hooks';
import type { MessageKey } from '../../locales';
import type { Outcome } from '../db/schema';
import { OUTCOMES, type OutcomeGroup } from '../core/outcome';

export interface OutcomeCardProps {
  t: (key: MessageKey) => string;
  group: OutcomeGroup;
  /** Shown in compare mode so the user can read their version next to the answer. */
  attemptText?: string;
  onRate: (outcome: Outcome) => void;
  onClose: () => void;
}

/**
 * Non-blocking card next to the chat. Appears right after sending, so it doesn't depend on
 * detecting the end of the answer. Rating is optional; it never steals focus.
 */
export function OutcomeCard({ t, group, attemptText, onRate, onClose }: OutcomeCardProps) {
  const [saved, setSaved] = useState(false);
  return (
    <div class="root">
      <section class="card" role="complementary" aria-labelledby="oc-title">
        <div class="head">
          <h2 id="oc-title">{t('outcome.title')}</h2>
          <button class="close" aria-label={t('outcome.dismiss')} onClick={onClose}>
            ×
          </button>
        </div>
        {saved ? (
          <p class="saved" role="status">
            {t('outcome.saved')}
          </p>
        ) : (
          <>
            <p class="hint">{t(group === 'check' ? 'outcome.hintCheck' : 'outcome.hintEdit')}</p>
            {attemptText && (
              <>
                <p class="label">{t('outcome.yourVersion')}</p>
                <blockquote>{attemptText}</blockquote>
              </>
            )}
            <div class="choices">
              {OUTCOMES[group].map((o) => (
                <button
                  key={o}
                  data-outcome={o}
                  onClick={() => {
                    setSaved(true);
                    onRate(o);
                  }}
                >
                  {t(`outcome.${o}`)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

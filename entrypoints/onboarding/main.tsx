import { render } from 'preact';
import { browser } from 'wxt/browser';
import { useEffect, useState } from 'preact/hooks';
import '../../src/pages/base.css';
import '../../src/pages/picker.css';
import './style.css';
import type { AutoCategory } from '../../src/classifier/types';
import { customTriggersItem, updateSettings } from '../../src/settings/storage';
import { createTrigger, validateTrigger, MAX_PHRASE_LENGTH } from '../../src/classifier/customTriggers';
import { CategoryPicker } from '../../src/pages/CategoryPicker';
import { useI18n, useSettings } from '../../src/pages/hooks';

function Onboarding() {
  const settings = useSettings();
  const { t, tf, lang } = useI18n(settings);
  const [picked, setPicked] = useState<AutoCategory[]>([]);
  const [phrase, setPhrase] = useState('');
  const [done, setDone] = useState<null | 'practice' | 'report'>(null);
  const [loaded, setLoaded] = useState(false);

  // Coming back to onboarding later: start from current choices.
  useEffect(() => {
    if (settings && !loaded) {
      if (settings.onboardingDone) setPicked(settings.practiceCategories);
      setLoaded(true);
    }
  }, [settings, loaded]);
  useEffect(() => {
    document.title = lang === 'pl' ? 'First You' : 'First You — Screen Time for your thinking';
  }, [lang]);

  const canStart = picked.length > 0 || phrase.trim().length > 0;

  const start = async () => {
    const trimmed = phrase.trim();
    if (trimmed) {
      const existing = await customTriggersItem.getValue();
      // Type "general" for now; it can be changed per phrase in settings.
      if (!validateTrigger(trimmed, existing)) {
        await customTriggersItem.setValue([...existing, createTrigger(trimmed, 'general')]);
      }
    }
    await updateSettings({ onboardingDone: true, practiceCategories: picked, reportOnly: false });
    setDone('practice');
  };
  const reportOnly = async () => {
    await updateSettings({ onboardingDone: true, practiceCategories: [], reportOnly: true });
    setDone('report');
  };

  if (done) {
    const first = picked[0];
    return (
      <main class="done">
        <h1>{t('onboarding.doneTitle')}</h1>
        {done === 'report' ? (
          <p class="lead">
            {t('onboarding.doneReportOnly')} {t('onboarding.doneBody')}
          </p>
        ) : (
          <>
            <p class="lead">{tf('onboarding.doneWhat', { limit: settings?.dailyLimit ?? 3 })}</p>
            {first && (
              <p class="try">
                {t('onboarding.doneTry')} <q>{t(`category.${first}.example`).replace(/^[„“"]|[”"]$/g, '')}</q>
              </p>
            )}
            {phrase.trim() && <p class="try">{tf('onboarding.doneTryPhrase', { phrase: phrase.trim() })}</p>}
            <p class="lead">{t('onboarding.doneBody')}</p>
          </>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>{t('onboarding.title')}</h1>
      <p class="lead">{t('onboarding.lead')}</p>
      <p class="privacy">
        {t('onboarding.privacy')}{' '}
        <a href={browser.runtime.getURL('/privacy.html')} target="_blank" rel="noopener">
          {t('privacy.link')}
        </a>
      </p>
      <h2 id="pick">{t('onboarding.pick')}</h2>
      <CategoryPicker t={t} value={picked} onChange={setPicked} labelledBy="pick" />
      <div class="phrase">
        <label for="phrase">{t('onboarding.phraseLabel')}</label>
        <p id="phrase-hint">{t('onboarding.phraseHint')}</p>
        <input
          id="phrase"
          type="text"
          maxLength={MAX_PHRASE_LENGTH}
          aria-describedby="phrase-hint"
          placeholder={t('onboarding.phrasePlaceholder')}
          value={phrase}
          onInput={(e) => setPhrase(e.currentTarget.value)}
        />
      </div>
      <p class="consent">{t('onboarding.consent')}</p>
      <div class="actions">
        <button type="button" class="primary" disabled={!canStart} onClick={start}>
          {t('onboarding.start')}
        </button>
        <button type="button" class="quiet" onClick={reportOnly}>
          {t('onboarding.reportOnly')}
        </button>
      </div>
    </main>
  );
}

render(<Onboarding />, document.getElementById('app')!);

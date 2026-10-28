import { render } from 'preact';
import { useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import '../../src/pages/base.css';
import '../../src/pages/picker.css';
import './style.css';
import type { TaskType } from '../../src/classifier/types';
import { createTrigger, validateTrigger, MAX_PHRASE_LENGTH, type TriggerError } from '../../src/classifier/customTriggers';
import { customTriggersItem, resetStorage, settingsItem, updateSettings } from '../../src/settings/storage';
import { DAILY_LIMIT_MAX, DAILY_LIMIT_MIN, type LanguagePref } from '../../src/settings/types';
import { deleteAllData, exportData } from '../../src/db/repository';
import { PAUSE_MS } from '../../src/core/policy';
import { REPO_URL } from '../../src/config';
import { CategoryPicker } from '../../src/pages/CategoryPicker';
import { formatDate, formatTime, useI18n, useItem, useSettings } from '../../src/pages/hooks';

const TASK_TYPES: TaskType[] = ['general', 'write', 'estimate', 'guess', 'summarize', 'decide', 'hypothesize'];

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Options() {
  const settings = useSettings();
  const triggers = useItem(customTriggersItem) ?? [];
  const { t, tf, lang } = useI18n(settings);
  const [phrase, setPhrase] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('general');
  const [error, setError] = useState<TriggerError | null>(null);

  if (!settings) return null;
  const now = Date.now();
  const paused = settings.pausedUntil !== null && settings.pausedUntil > now;
  const muted = Object.entries(settings.mutedCategories).filter(([, until]) => until > now);

  const muteLabel = (key: string) => {
    if (key.startsWith('custom:')) {
      const tr = triggers.find((x) => `custom:${x.id}` === key);
      return tr ? `„${tr.phrase}”` : t('options.removedPhrase');
    }
    return t(`category.${key as 'email'}.title`);
  };

  const addPhrase = async () => {
    const err = validateTrigger(phrase, triggers);
    setError(err);
    if (err) return;
    await customTriggersItem.setValue([...triggers, createTrigger(phrase, taskType)]);
    setPhrase('');
  };

  const exportAll = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: await settingsItem.getValue(),
      customTriggers: triggers,
      ...(await exportData()),
    };
    download('first-you-data.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  };

  const deleteAll = async () => {
    if (!confirm(t('options.deleteConfirm'))) return;
    await deleteAllData();
    await resetStorage();
    location.href = browser.runtime.getURL('/onboarding.html');
  };

  return (
    <main>
      <h1>{t('options.title')}</h1>

      <section>
        <h2 id="cats">{t('options.categories')}</h2>
        <CategoryPicker
          t={t}
          value={settings.practiceCategories}
          onChange={(practiceCategories) => void updateSettings({ practiceCategories })}
          labelledBy="cats"
        />
      </section>

      <section>
        <h2>{t('options.phrases')}</h2>
        <p class="hint">{t('options.phrasesHint')}</p>
        {triggers.length === 0 ? (
          <p class="empty">{t('options.phraseEmpty')}</p>
        ) : (
          <ul class="rows">
            {triggers.map((tr) => (
              <li key={tr.id}>
                <span class="grow">„{tr.phrase}”</span>
                <select
                  aria-label={`${t('options.phraseTask')}: ${tr.phrase}`}
                  value={tr.taskType}
                  onChange={(e) =>
                    void customTriggersItem.setValue(
                      triggers.map((x) => (x.id === tr.id ? { ...x, taskType: e.currentTarget.value as TaskType } : x)),
                    )
                  }
                >
                  {TASK_TYPES.map((tt) => (
                    <option key={tt} value={tt}>
                      {t(`taskName.${tt}`)}
                    </option>
                  ))}
                </select>
                <button
                  class="link"
                  onClick={() => void customTriggersItem.setValue(triggers.filter((x) => x.id !== tr.id))}
                >
                  {t('options.phraseRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div class="add">
          <input
            type="text"
            aria-label={t('options.phrases')}
            maxLength={MAX_PHRASE_LENGTH}
            placeholder={t('options.phrasePlaceholder')}
            value={phrase}
            onInput={(e) => (setPhrase(e.currentTarget.value), setError(null))}
            onKeyDown={(e) => e.key === 'Enter' && void addPhrase()}
          />
          <select
            aria-label={t('options.phraseTask')}
            value={taskType}
            onChange={(e) => setTaskType(e.currentTarget.value as TaskType)}
          >
            {TASK_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {t(`taskName.${tt}`)}
              </option>
            ))}
          </select>
          <button class="btn primary" onClick={() => void addPhrase()}>
            {t('options.phraseAdd')}
          </button>
        </div>
        {error && (
          <p class="error" role="alert">
            {t(`options.err.${error}`)}
          </p>
        )}
      </section>

      <section>
        <h2>
          <label for="limit">{t('options.limit')}</label>
        </h2>
        <p class="hint">{t('options.limitHint')}</p>
        <input
          id="limit"
          type="number"
          min={DAILY_LIMIT_MIN}
          max={DAILY_LIMIT_MAX}
          value={settings.dailyLimit}
          onChange={(e) => {
            const v = Math.round(Number(e.currentTarget.value));
            if (Number.isFinite(v)) {
              void updateSettings({ dailyLimit: Math.min(DAILY_LIMIT_MAX, Math.max(DAILY_LIMIT_MIN, v)) });
            }
          }}
        />
      </section>

      <section>
        <h2>{t('options.pause')}</h2>
        <div class="inline">
          <span>{paused ? tf('options.pausedUntil', { time: formatTime(lang, settings.pausedUntil!) }) : t('options.notPaused')}</span>
          {paused ? (
            <button class="btn" onClick={() => void updateSettings({ pausedUntil: null })}>
              {t('options.endPause')}
            </button>
          ) : (
            <button class="btn" onClick={() => void updateSettings({ pausedUntil: Date.now() + PAUSE_MS })}>
              {t('options.startPause')}
            </button>
          )}
        </div>
      </section>

      <section>
        <h2>{t('options.muted')}</h2>
        <p class="hint">{t('options.mutedHint')}</p>
        {muted.length === 0 ? (
          <p class="empty">{t('options.noneMuted')}</p>
        ) : (
          <ul class="rows">
            {muted.map(([key, until]) => (
              <li key={key}>
                <span class="grow">
                  {muteLabel(key)} — {tf('options.mutedUntil', { date: formatDate(lang, until) })}
                </span>
                <button
                  class="link"
                  onClick={() => {
                    const { [key]: _gone, ...rest } = settings.mutedCategories;
                    void updateSettings({ mutedCategories: rest, skipStreaks: { ...settings.skipStreaks, [key]: 0 } });
                  }}
                >
                  {t('options.unmute')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.reportOnly}
            onChange={(e) => void updateSettings({ reportOnly: e.currentTarget.checked })}
          />
          {t('options.reportOnly')}
        </label>
      </section>

      <section>
        <h2>
          <label for="lang">{t('options.language')}</label>
        </h2>
        <select
          id="lang"
          value={settings.language}
          onChange={(e) => void updateSettings({ language: e.currentTarget.value as LanguagePref })}
        >
          <option value="auto">{t('options.langAuto')}</option>
          <option value="pl">Polski</option>
          <option value="en">English</option>
        </select>
      </section>

      <section>
        <h2>{t('options.data')}</h2>
        <p class="hint">
          {t('options.dataHint')}{' '}
          <a href={browser.runtime.getURL('/privacy.html')} target="_blank" rel="noopener">
            {t('privacy.link')}
          </a>
        </p>
        <div class="inline">
          {REPO_URL && (
            <a class="btn" href={`${REPO_URL}/issues/new/choose`} target="_blank" rel="noopener">
              {t('options.report')}
            </a>
          )}
          <button class="btn" onClick={() => void exportAll()}>
            {t('options.export')}
          </button>
          <button class="btn danger" onClick={() => void deleteAll()}>
            {t('options.delete')}
          </button>
        </div>
      </section>
    </main>
  );
}

render(<Options />, document.getElementById('app')!);

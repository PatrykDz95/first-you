import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import '../../src/pages/base.css';
import './style.css';
import { dailyCounterItem, reportReadyItem, updateSettings } from '../../src/settings/storage';
import { formatTime, useI18n, useItem, useSettings } from '../../src/pages/hooks';
import { triesSince } from '../../src/db/repository';
import { PAUSE_MS, shownToday } from '../../src/core/policy';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function open(path: Parameters<typeof browser.runtime.getURL>[0]) {
  void browser.tabs.create({ url: browser.runtime.getURL(path) });
  window.close();
}

function Popup() {
  const settings = useSettings();
  const counter = useItem(dailyCounterItem);
  const reportReady = useItem(reportReadyItem);
  const { t, tf, lang } = useI18n(settings);
  const [tries, setTries] = useState<number | null>(null);
  const now = Date.now();

  useEffect(() => {
    void triesSince(startOfToday()).then(setTries);
  }, []);

  if (!settings) return null;
  const paused = settings.pausedUntil !== null && settings.pausedUntil > now;

  return (
    <main>
      <h1>First You</h1>
      {!settings.onboardingDone ? (
        <div class="block">
          <button class="action" onClick={() => open('/onboarding.html')}>
            {t('popup.finishSetup')}
          </button>
        </div>
      ) : (
        <>
          <p class="today">{tries === null ? '…' : tf('popup.tries', { n: tries })}</p>
          <p class="meta">
            {tf('popup.windows', { used: counter ? shownToday(counter, now) : 0, limit: settings.dailyLimit })}
          </p>
          <div class="block">
            {settings.reportOnly ? (
              <p class="status">{t('popup.reportOnly')}</p>
            ) : paused ? (
              <>
                <p class="status">{tf('popup.paused', { time: formatTime(lang, settings.pausedUntil!) })}</p>
                <button class="action" onClick={() => void updateSettings({ pausedUntil: null })}>
                  {t('popup.endPause')}
                </button>
              </>
            ) : (
              <button class="action" onClick={() => void updateSettings({ pausedUntil: Date.now() + PAUSE_MS })}>
                {t('popup.hurry')}
              </button>
            )}
          </div>
        </>
      )}
      <nav>
        <a href="#" onClick={(e) => (e.preventDefault(), open('/report.html'))}>
          {t('popup.report')}
          {reportReady ? <span class="dot">• {t('popup.newReport')}</span> : null}
        </a>
        <a href="#" onClick={(e) => (e.preventDefault(), browser.runtime.openOptionsPage(), window.close())}>
          {t('popup.settings')}
        </a>
      </nav>
    </main>
  );
}

render(<Popup />, document.getElementById('app')!);

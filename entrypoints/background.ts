import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { listen } from '../src/messaging/protocol';
import { cleanup, recordPrompt, setOutcome } from '../src/db/repository';
import { reportReadyItem, settingsItem, updateSettings } from '../src/settings/storage';
import { nextSundayAt18, weekStart } from '../src/core/time';

const CLEANUP_ALARM = 'cleanup';
const REPORT_ALARM = 'weekly-report';

async function ensureAlarms() {
  if (!(await browser.alarms.get(CLEANUP_ALARM))) {
    await browser.alarms.create(CLEANUP_ALARM, { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  }
  if (!(await browser.alarms.get(REPORT_ALARM))) {
    // One-shot, re-armed on every fire: a fixed 7-day period would drift across DST changes.
    await browser.alarms.create(REPORT_ALARM, { when: nextSundayAt18(Date.now()) });
  }
}

async function renderBadge(ready: number | null) {
  await browser.action.setBadgeBackgroundColor({ color: '#2f6f5e' });
  await browser.action.setBadgeText({ text: ready ? '•' : '' });
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      await browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') });
    }
    await ensureAlarms();
  });
  browser.runtime.onStartup.addListener(() => void ensureAlarms());

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === REPORT_ALARM) {
      await reportReadyItem.setValue(weekStart(Date.now()));
      await browser.alarms.create(REPORT_ALARM, { when: nextSundayAt18(Date.now() + 60_000) });
      return;
    }
    if (alarm.name !== CLEANUP_ALARM) return;
    await cleanup();
    // Drop expired mutes so settings stay tidy (gating ignores them anyway).
    const s = await settingsItem.getValue();
    const now = Date.now();
    const muted = Object.fromEntries(Object.entries(s.mutedCategories).filter(([, until]) => until > now));
    if (Object.keys(muted).length !== Object.keys(s.mutedCategories).length) {
      await updateSettings({ mutedCategories: muted });
    }
  });

  reportReadyItem.watch((v) => void renderBadge(v));
  void reportReadyItem.getValue().then(renderBadge);

  listen({
    recordPrompt: async ({ event, attemptText }) => ({ id: await recordPrompt(event, attemptText) }),
    setOutcome: async ({ id, outcome }) => {
      await setOutcome(id, outcome);
      return { ok: true };
    },
  });
});

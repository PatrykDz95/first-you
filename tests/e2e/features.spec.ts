import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/** Outcome card, popup, settings, report, consent. Built with E2E=1 (open shadow roots). */

const modal = (page: Page) => page.locator('first-you-modal');
const card = (page: Page) => page.locator('first-you-card');

async function onboard(page: Page, id: string, cats = [0, 1, 2]) {
  await page.goto(`chrome-extension://${id}/onboarding.html`);
  for (const i of cats) await page.locator('.skill').nth(i).click();
  await page.locator('.primary').click();
  await expect(page.locator('.done')).toBeVisible();
}

async function events(page: Page) {
  return page.evaluate(
    async () => {
      // Don't create the database by looking at it: nothing recorded yet = no database.
      if (!(await indexedDB.databases()).some((d) => d.name === 'first-you')) return [];
      return new Promise<{ decision: string; outcome?: string; topic: string }[]>((resolve, reject) => {
        const req = indexedDB.open('first-you');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const r = req.result.transaction('promptEvents').objectStore('promptEvents').getAll();
          r.onsuccess = () => resolve(r.result);
        };
      });
    },
  );
}

async function sendInPlayground(page: Page, text: string) {
  await page.locator('#pg-input').fill(text);
  await page.locator('#pg-input').press('Enter');
}

test('compare: outcome card shows my version, rating is saved, card steps aside', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  await sendInPlayground(page, 'Ile to jest 17 razy 23?');
  await expect(modal(page)).toHaveCount(1);
  await page.keyboard.type('około 400');
  await page.keyboard.press('Enter'); // estimate: primary = compare
  await expect(card(page)).toHaveCount(1);
  await expect(card(page).locator('blockquote')).toHaveText('około 400');

  await card(page).locator('button[data-outcome="close"]').click();
  await expect.poll(async () => (await events(page))[0]?.outcome).toBe('close');
  await expect(card(page)).toHaveCount(0, { timeout: 4000 });

  // Review mode: no attempt quote, edit-type rating; typing the next prompt closes it.
  await page.locator('button', { hasText: /Reset|Wyzeruj/ }).click();
  await sendInPlayground(page, 'Napisz maila do szefa, że jutro biorę dzień wolnego.');
  await page.keyboard.type('Szefie, jutro wolne.');
  await page.keyboard.press('Enter');
  await expect(card(page)).toHaveCount(1);
  await expect(card(page).locator('blockquote')).toHaveCount(0);
  await expect(card(page).locator('button[data-outcome="ai_little"]')).toHaveCount(1);
  await page.locator('#pg-input').click();
  await page.keyboard.type('x');
  await expect(card(page)).toHaveCount(0);
});

test('popup: today count and "I\'m in a hurry" pause', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('.today')).toHaveText(/^0 /);
  await popup.locator('button.action').click(); // hurry
  await expect(popup.locator('.status')).toBeVisible();

  await page.goto(`chrome-extension://${extensionId}/playground.html`);
  await sendInPlayground(page, 'Napisz maila do szefa, że jutro biorę dzień wolnego.');
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveCount(1);

  await popup.reload();
  await popup.locator('button.action').click(); // end pause
  await expect(popup.locator('.status')).toHaveCount(0);
});

test('settings: phrases with task type, validation, language, limit', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  const add = page.locator('.add input[type="text"]');
  await add.fill('przetłumacz');
  await page.locator('.add select').selectOption('write');
  await page.locator('.add button').click();
  await expect(page.locator('.rows li')).toHaveCount(1);
  await expect(page.locator('.rows li select')).toHaveValue('write');

  await add.fill('Przetlumacz');
  await page.locator('.add button').click();
  await expect(page.locator('.error')).toBeVisible(); // duplicate (case/diacritics-insensitive)

  await page.locator('#limit').fill('0');
  await page.locator('#limit').blur();
  await page.locator('#lang').selectOption('pl');
  await expect(page.locator('h1')).toHaveText('Ustawienia');

  // Limit 0: even the phrase does not open a window.
  const chat = await context.newPage();
  await chat.goto(`chrome-extension://${extensionId}/playground.html`);
  await sendInPlayground(chat, 'Przetłumacz na angielski: dziękuję');
  await expect(modal(chat)).toHaveCount(0);
  await expect(chat.locator('.pg-msg-user')).toHaveCount(1);
});

test('report: live numbers, mirror and a downloadable card', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);
  await sendInPlayground(page, 'Ile to jest 17 razy 23?');
  await page.keyboard.type('400');
  await page.keyboard.press('Enter');
  await expect(card(page)).toHaveCount(1);
  await sendInPlayground(page, 'Jak działa Kafka consumer group rebalancing w praktyce?');
  await expect(page.locator('.pg-msg-user')).toHaveCount(2);

  const report = await context.newPage();
  await report.goto(`chrome-extension://${extensionId}/report.html`);
  await expect(report.locator('.stat .big').first()).toHaveText('1');
  await expect(report.locator('.bars li')).toHaveCount(2); // math + code
  await expect(report.locator('img.card-preview')).toBeVisible();
  const [download] = await Promise.all([report.waitForEvent('download'), report.locator('button.primary').click()]);
  expect(download.suggestedFilename()).toBe('first-you-week.png');
});

test('settings: export downloads JSON, delete wipes everything and returns to onboarding', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);
  await sendInPlayground(page, 'Jak działa Kafka?');
  await expect(page.locator('.pg-msg-user')).toHaveCount(1);

  const opts = await context.newPage();
  await opts.goto(`chrome-extension://${extensionId}/options.html`);
  const [download] = await Promise.all([opts.waitForEvent('download'), opts.locator('button', { hasText: /JSON/ }).click()]);
  expect(download.suggestedFilename()).toBe('first-you-data.json');

  opts.once('dialog', (d) => void d.accept());
  await opts.locator('button.danger').click();
  await expect(opts).toHaveURL(/onboarding\.html/);
  expect(await events(opts)).toHaveLength(0);
  await expect(opts.locator('.skill[aria-pressed="true"]')).toHaveCount(0);
});

test('nothing is processed before consent on onboarding; privacy page is available', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/playground.html`);
  await sendInPlayground(page, 'Napisz maila do szefa, że jutro biorę dzień wolnego.');
  await expect(page.locator('.pg-msg-user')).toHaveCount(1); // sent normally
  await expect(modal(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await events(page)).toHaveLength(0); // not even statistics

  const privacy = await context.newPage();
  await privacy.goto(`chrome-extension://${extensionId}/privacy.html`);
  await expect(privacy.locator('h1')).toContainText(/Privacy Policy|Polityka prywatności/);
  await expect(privacy.locator('h2')).toHaveCount(9);
});

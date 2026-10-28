import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Full "First you" flow on the extension's playground page (fake chat, real adapter/controller/dialog).
 * The dialog lives in a CLOSED shadow root, so these tests drive it by keyboard only,
 * which also covers the "keyboard only" acceptance criterion.
 */

const modal = (page: Page) => page.locator('first-you-modal');

async function onboard(page: Page, id: string) {
  await page.goto(`chrome-extension://${id}/onboarding.html`);
  await page.locator('.skill').first().click(); // email
  await page.locator('.skill').nth(2).click(); // fact
  await page.locator('.primary').click();
  await expect(page.locator('.done')).toBeVisible();
}

async function countEvents(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ events: number; attempts: number; decisions: string[] }>((resolve, reject) => {
        const req = indexedDB.open('first-you');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(['promptEvents', 'attempts']);
          const ev = tx.objectStore('promptEvents').getAll();
          const at = tx.objectStore('attempts').count();
          tx.oncomplete = () =>
            resolve({
              events: ev.result.length,
              attempts: at.result,
              decisions: ev.result.map((e: { decision: string }) => e.decision),
            });
        };
      }),
  );
}

test('opens onboarding on install', async ({ context, extensionId }) => {
  const page = await context.waitForEvent('page', {
    predicate: (p) => p.url().includes(`${extensionId}/onboarding.html`),
    timeout: 5000,
  }).catch(() => context.pages().find((p) => p.url().includes('onboarding.html')));
  expect(page).toBeTruthy();
});

test('writing task: Enter = review mode, original stays on top and the try is appended', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  const prompt = 'Napisz maila do szefa, że jutro biorę dzień wolnego.';
  await page.locator('#pg-input').fill(prompt);
  await page.locator('#pg-input').press('Enter');

  await expect(modal(page)).toHaveCount(1);
  await expect(page.locator('.pg-msg-user')).toHaveCount(0); // held back

  await page.keyboard.type('urlop jutro, wracam w czwartek');
  await page.keyboard.press('Enter');

  await expect(modal(page)).toHaveCount(0);
  const sent = page.locator('.pg-msg-user');
  await expect(sent).toHaveCount(1);
  const text = (await sent.textContent()) ?? '';
  expect(text.startsWith(prompt)).toBe(true);
  expect(text).toContain('urlop jutro, wracam w czwartek');
  expect(text).toContain('Nie pisz jej od nowa');
  await expect.poll(() => countEvents(page)).toMatchObject({ events: 1, attempts: 1, decisions: ['review'] });
});

test('"Send and compare" sends the original prompt unchanged', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  const prompt = 'Napisz maila do szefa, że jutro biorę dzień wolnego.';
  await page.locator('#pg-input').fill(prompt);
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(1);
  await expect(modal(page).locator('textarea')).toBeFocused();
  await page.keyboard.type('urlop jutro');
  // Tab order: textarea -> primary (review) -> secondary (compare)
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveText(prompt);
  await expect.poll(() => countEvents(page)).toMatchObject({ attempts: 1, decisions: ['attempt'] });
});

test('onboarding with only an own phrase is enough, and the phrase triggers the window', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/onboarding.html`);
  await expect(page.locator('.primary')).toBeDisabled();
  await page.locator('#phrase').fill('przetłumacz');
  await expect(page.locator('.primary')).toBeEnabled();
  await page.locator('.primary').click();
  await expect(page.locator('.done')).toBeVisible();

  await page.goto(`chrome-extension://${extensionId}/playground.html`);
  await page.locator('#pg-input').fill('Przetlumacz na angielski: dziękuję za spotkanie');
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pg-msg-user')).toHaveCount(1);
});

test('Esc skips and still sends; non-matching prompt never shows the window', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  await page.locator('#pg-input').fill('Co to jest fotosynteza?');
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveText('Co to jest fotosynteza?');

  // Ongoing conversation now; a short follow-up must go straight through.
  await page.locator('#pg-input').fill('podsumuj to');
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveCount(2);

  await expect.poll(() => countEvents(page)).toMatchObject({ events: 2, attempts: 0, decisions: ['skip', 'none'] });
});

test('unselected category and Shift+Enter are never intercepted', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId); // email + fact only
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  await page.locator('#pg-input').fill('Ile to jest 17 razy 23?'); // math: not selected
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveCount(1);

  await page.locator('#pg-send').click(); // empty, nothing happens
  await page.locator('#pg-input').fill('line one');
  await page.locator('#pg-input').press('Shift+Enter');
  await expect(page.locator('#pg-input')).toHaveValue('line one\n');
  await expect(modal(page)).toHaveCount(0);
});

test('"I\'m in a hurry" pauses windows for 2 hours', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await onboard(page, extensionId);
  await page.goto(`chrome-extension://${extensionId}/playground.html`);

  await page.locator('#pg-input').fill('Write an email to my landlord asking to fix the heating.');
  await page.locator('#pg-send').click(); // click path, not Enter
  await expect(modal(page)).toHaveCount(1);
  await expect(modal(page).locator('textarea')).toBeFocused();
  // Tab order: textarea -> (both send buttons disabled while empty) skip -> hurry
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.pg-msg-user')).toHaveCount(1);

  await page.reload();
  await page.locator('#pg-input').fill('Napisz maila do szefa, że jutro biorę dzień wolnego.');
  await page.locator('#pg-input').press('Enter');
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(() => countEvents(page)).toMatchObject({ decisions: ['paused', 'none'] });
});

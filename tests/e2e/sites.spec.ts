import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Real content scripts + site adapters against minimized copies of each chat site's DOM
 * (tests/fixtures/<site>.html), served under the real URL by Playwright: no network, no login.
 * Every fixture exposes #prompt (main editor), #send (send button), `.edit-input` (edit-message
 * field inside a turn) and window.__editSaved.
 */
const SITES = [
  { name: 'chatgpt', url: 'https://chatgpt.com/', bubble: 'main:visible [data-user-message-bubble]' },
  { name: 'claude', url: 'https://claude.ai/new', bubble: '[data-cds="UserMessage"] .text' },
  { name: 'gemini', url: 'https://gemini.google.com/app', bubble: 'user-query .query-text' },
] as const;

for (const site of SITES) {
  test.describe(site.name, () => {
    const fixture = readFileSync(new URL(`../fixtures/${site.name}.html`, import.meta.url), 'utf8');
    const modal = (page: Page) => page.locator('first-you-modal');
    const bubbles = (page: Page) => page.locator(site.bubble);

    async function setup(context: BrowserContext, extensionId: string) {
      const onboarding = await context.newPage();
      await onboarding.goto(`chrome-extension://${extensionId}/onboarding.html`);
      await onboarding.locator('.skill').first().click(); // email
      await onboarding.locator('.primary').click();
      await expect(onboarding.locator('.done')).toBeVisible();
      await context.route(`${new URL(site.url).origin}/**`, (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: fixture }),
      );
      const page = await context.newPage();
      await page.goto(site.url);
      return page;
    }

    async function typePrompt(page: Page, text: string) {
      await page.locator('#prompt').click();
      await page.keyboard.type(text);
    }

    const prompt = 'Napisz maila do szefa, że jutro biorę dzień wolnego.';

    test('matching prompt is held; review mode edits the real editor and sends', async ({ context, extensionId }) => {
      const page = await setup(context, extensionId);
      await typePrompt(page, prompt);
      await page.keyboard.press('Enter');
      await expect(modal(page)).toHaveCount(1);
      await expect(bubbles(page)).toHaveCount(0);

      await expect(modal(page).locator('textarea')).toBeFocused();
      await page.keyboard.type('wolne jutro, wracam w czwartek');
      await page.keyboard.press('Enter');

      await expect(modal(page)).toHaveCount(0);
      await expect(bubbles(page)).toHaveCount(1);
      const text = (await bubbles(page).first().innerText()).replace(/\s+/g, ' ');
      expect(text.startsWith(prompt)).toBe(true);
      expect(text).toContain('wolne jutro, wracam w czwartek');
    });

    test('compare mode sends the original unchanged', async ({ context, extensionId }) => {
      const page = await setup(context, extensionId);
      await typePrompt(page, prompt);
      await page.keyboard.press('Enter');
      await expect(modal(page).locator('textarea')).toBeFocused();
      await page.keyboard.type('wolne jutro');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(modal(page)).toHaveCount(0);
      await expect(bubbles(page).first()).toHaveText(prompt);
    });

    test('send button click is intercepted too; Esc skips and still sends', async ({ context, extensionId }) => {
      const page = await setup(context, extensionId);
      await typePrompt(page, 'Write an email to my landlord asking to fix the heating.');
      await page.locator('#send').click();
      await expect(modal(page)).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(modal(page)).toHaveCount(0);
      await expect(bubbles(page)).toHaveCount(1);
    });

    test('non-matching prompt goes straight through; short follow-up mid-conversation stays silent', async ({
      context,
      extensionId,
    }) => {
      const page = await setup(context, extensionId);
      await typePrompt(page, 'Jak działa rebalancing w Kafka consumer group?');
      await page.keyboard.press('Enter');
      await expect(modal(page)).toHaveCount(0);
      await expect(bubbles(page)).toHaveCount(1);

      await expect(page.locator('#send')).toHaveCount(1);
      await typePrompt(page, 'napisz maila o tym');
      await page.keyboard.press('Enter');
      await expect(modal(page)).toHaveCount(0);
      await expect(bubbles(page)).toHaveCount(2);
    });

    test('the edit-message field is never intercepted', async ({ context, extensionId }) => {
      const page = await setup(context, extensionId);
      await typePrompt(page, 'Jak działa Kafka?');
      await page.keyboard.press('Enter');
      await expect(bubbles(page)).toHaveCount(1);

      await page.locator('.edit-input').first().click();
      await page.keyboard.press('End');
      await page.keyboard.type(' Napisz maila do szefa o urlopie.');
      await page.keyboard.press('Enter');
      await expect(modal(page)).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __editSaved: boolean }).__editSaved)).toBe(true);
    });
  });
}

const ATTACH: Record<string, { url: string; container: string; html: string }> = {
  gemini: {
    url: 'https://gemini.google.com/app',
    container: '.attachment-preview-wrapper',
    html: '<uploader-file-preview class="file-preview-chip"><gem-attachment>img.png</gem-attachment></uploader-file-preview>',
  },
  claude: {
    url: 'https://claude.ai/new',
    container: '#attachments',
    html: '<div data-cds="MessageAttachmentsFile" data-testid="file-thumbnail" data-cds-attachment="">notes.txt</div>',
  },
};

for (const [name, a] of Object.entries(ATTACH)) {
  test(`${name}: a prompt with a file attached never gets the window`, async ({ context, extensionId }) => {
    const fixture = readFileSync(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8');
    const onboarding = await context.newPage();
    await onboarding.goto(`chrome-extension://${extensionId}/onboarding.html`);
    await onboarding.locator('.skill').first().click();
    await onboarding.locator('.primary').click();
    await expect(onboarding.locator('.done')).toBeVisible();
    await context.route(`${new URL(a.url).origin}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: fixture }),
    );
    const page = await context.newPage();
    await page.goto(a.url);
    await page.evaluate(({ container, html }) => (document.querySelector(container)!.innerHTML = html), a);
    await page.locator('#prompt').click();
    await page.keyboard.type('Napisz maila do szefa, że jutro biorę dzień wolnego.');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await expect(page.locator('first-you-modal')).toHaveCount(0);
  });
}

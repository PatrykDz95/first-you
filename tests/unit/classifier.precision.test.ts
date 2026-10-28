import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classify, AUTO_CATEGORIES, type PromptCategory } from '../../src/classifier';

type Example = { text: string; expected: PromptCategory | null };
const load = (lang: string): Example[] =>
  JSON.parse(readFileSync(new URL(`../fixtures/prompts.${lang}.json`, import.meta.url), 'utf8'));

const examples = [...load('pl'), ...load('en')];

const run = (e: Example) =>
  classify({
    text: e.text,
    hasAttachments: false,
    practiceCategories: AUTO_CATEGORIES,
    customTriggers: [],
    ongoing: false,
  });

describe('classifier quality (≥90% precision on ≥100 PL+EN prompts)', () => {
  it('fixture set is big enough and balanced', () => {
    expect(examples.length).toBeGreaterThanOrEqual(100);
    const pos = examples.filter((e) => e.expected).length;
    expect(Math.abs(pos - (examples.length - pos))).toBeLessThanOrEqual(examples.length * 0.1);
  });

  it('precision among prompts that would open the window is ≥ 90%', () => {
    const fired = examples.map((e) => ({ e, r: run(e) })).filter(({ r }) => r.taskType !== null);
    const wrong = fired.filter(({ e, r }) => r.category !== e.expected);
    const precision = (fired.length - wrong.length) / fired.length;
    const positives = examples.filter((e) => e.expected).length;
    const recall = (fired.length - wrong.length) / positives;
    console.info(
      `precision ${(precision * 100).toFixed(1)}% (${fired.length - wrong.length}/${fired.length}), ` +
        `recall ${(recall * 100).toFixed(1)}%`,
    );
    if (wrong.length) console.info('false positives:', wrong.map(({ e, r }) => `[${r.category}] ${e.text}`));
    expect(precision).toBeGreaterThanOrEqual(0.9);
  });

  it.each(examples.filter((e) => e.expected))('detects $expected: $text', (e) => {
    expect(run(e).category).toBe(e.expected);
  });

  it.each(examples.filter((e) => !e.expected))('stays silent: $text', (e) => {
    expect(run(e).taskType).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { classify, AUTO_CATEGORIES, type ClassifyInput } from '../../src/classifier';
import { isDebug } from '../../src/classifier/debug';
import { buildReviewPrompt, primaryDecision, reviewLang } from '../../src/core/reviewPrompt';
import { applyDecision } from '../../src/core/policy';
import { DEFAULT_SETTINGS } from '../../src/settings/types';

const base: ClassifyInput = {
  text: '',
  hasAttachments: false,
  practiceCategories: AUTO_CATEGORIES,
  customTriggers: [],
  ongoing: false,
};
const c = (text: string, over: Partial<ClassifyInput> = {}) => classify({ ...base, ...over, text });

describe('debug category', () => {
  it('pasted errors and traces count, mentions inside a sentence do not', () => {
    expect(isDebug('TypeError: x is undefined')).toBe(true);
    expect(isDebug('Mam problem:\nNullPointerException: name is null')).toBe(true);
    expect(isDebug('  at a (x.js:1:2)\n  at b (y.js:3:4)')).toBe(true);
    expect(isDebug('Napisz funkcję, która rzuca IllegalArgumentException: gdy wiek < 0')).toBe(false);
    expect(isDebug('What is a TypeError in JavaScript?')).toBe(false);
    expect(isDebug('Error handling best practices in Go')).toBe(false);
  });

  it('is the only category allowed inside code blocks', () => {
    const r = c('Why?\n```\nTraceback (most recent call last):\n  File "a.py", line 1\nNameError: x\n```');
    expect(r.category).toBe('debug');
    expect(r.taskType).toBe('hypothesize');
    expect(c('Napisz maila\n```\nfoo\n```').reason).toBe('has_code');
  });

  it('respects selection like every other category', () => {
    expect(c('TypeError: x is undefined', { practiceCategories: ['email'] }).reason).toBe('not_selected');
  });
});

describe('review mode', () => {
  it('keeps the original prompt verbatim on top and appends the attempt', () => {
    const p = buildReviewPrompt('Napisz maila do szefa.', 'Szefie, jutro wolne.', 'write', 'pl');
    expect(p.startsWith('Napisz maila do szefa.\n\n---\n')).toBe(true);
    expect(p).toContain('Szefie, jutro wolne.');
    expect(p).toContain('Nie pisz jej od nowa');
  });

  it('checks guesses instead of reviewing prose', () => {
    expect(buildReviewPrompt('What is 15% of 80?', '12', 'estimate', 'en')).toContain('whether my version is right');
  });

  it('template language follows the prompt', () => {
    expect(reviewLang('Napisz maila do szefa, że…', 'urlop', 'en')).toBe('pl');
    expect(reviewLang('Write an email to my landlord', 'heating broken', 'pl')).toBe('en');
    expect(reviewLang('kafka rebalance', 'nie wiem', 'pl')).toBe('pl');
  });

  it('primary button: review for writing and hypotheses, compare for estimates and guesses', () => {
    expect(primaryDecision('write')).toBe('review');
    expect(primaryDecision('hypothesize')).toBe('review');
    expect(primaryDecision('estimate')).toBe('attempt');
    expect(primaryDecision('guess')).toBe('attempt');
  });

  it('counts as an attempt for skip streaks', () => {
    const s = { ...DEFAULT_SETTINGS, skipStreaks: { email: 2 } };
    expect(applyDecision(s, 'email', 'review', 0)).toEqual({ skipStreaks: { email: 0 } });
  });
});

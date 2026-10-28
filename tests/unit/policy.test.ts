import { describe, expect, it } from 'vitest';
import { applyDecision, gateWindow, incrementCounter, muteKey, MUTE_MS, PAUSE_MS } from '../../src/core/policy';
import { DEFAULT_SETTINGS, type Settings } from '../../src/settings/types';
import { localDate } from '../../src/core/time';
import type { ClassifyResult } from '../../src/classifier';

const now = new Date(2026, 9, 27, 12, 0).getTime();
const today = localDate(now);
const s = (over: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  onboardingDone: true,
  practiceCategories: ['email'],
  ...over,
});
const hit: ClassifyResult = { category: 'email', taskType: 'write', wordCount: 8 };
const counter = { date: today, shown: 0 };

describe('gateWindow', () => {
  it('shows when everything allows it', () => {
    expect(gateWindow(hit, s(), counter, now)).toEqual({ show: true });
  });
  it('respects classifier, report-only, pause, mute and daily limit', () => {
    expect(gateWindow({ ...hit, taskType: null }, s(), counter, now)).toMatchObject({ reason: 'classifier' });
    expect(gateWindow(hit, s({ reportOnly: true }), counter, now)).toMatchObject({ reason: 'report_only' });
    expect(gateWindow(hit, s({ pausedUntil: now + 1 }), counter, now)).toMatchObject({ reason: 'paused' });
    expect(gateWindow(hit, s({ pausedUntil: now - 1 }), counter, now)).toEqual({ show: true });
    expect(gateWindow(hit, s({ mutedCategories: { email: now + 1 } }), counter, now)).toMatchObject({
      reason: 'muted',
    });
    expect(gateWindow(hit, s(), { date: today, shown: 3 }, now)).toMatchObject({ reason: 'daily_limit' });
    expect(gateWindow(hit, s({ dailyLimit: 0 }), counter, now)).toMatchObject({ reason: 'daily_limit' });
  });
  it('yesterday\'s counter does not count today', () => {
    expect(gateWindow(hit, s(), { date: '2000-01-01', shown: 99 }, now)).toEqual({ show: true });
  });
  it('custom phrases are muted one by one', () => {
    expect(muteKey({ category: 'custom', customTriggerId: 'ct_1' })).toBe('custom:ct_1');
  });
});

describe('applyDecision', () => {
  it('3 skips in a row mute the category for 7 days', () => {
    let st = s();
    for (let i = 0; i < 2; i++) st = { ...st, ...applyDecision(st, 'email', 'skip', now) };
    expect(st.mutedCategories.email).toBeUndefined();
    st = { ...st, ...applyDecision(st, 'email', 'skip', now) };
    expect(st.mutedCategories.email).toBe(now + MUTE_MS);
    expect(st.skipStreaks.email).toBe(0);
  });
  it('an attempt resets the streak', () => {
    let st = s({ skipStreaks: { email: 2 } });
    st = { ...st, ...applyDecision(st, 'email', 'attempt', now) };
    st = { ...st, ...applyDecision(st, 'email', 'skip', now) };
    expect(st.mutedCategories.email).toBeUndefined();
  });
  it('misfire and pause never count as skips', () => {
    const st = s({ skipStreaks: { email: 2 } });
    expect(applyDecision(st, 'email', 'misfire', now)).toEqual({});
    expect(applyDecision(st, 'email', 'paused', now)).toEqual({ pausedUntil: now + PAUSE_MS });
  });
});

describe('incrementCounter', () => {
  it('resets on a new local day', () => {
    expect(incrementCounter({ date: '2000-01-01', shown: 5 }, now)).toEqual({ date: today, shown: 1 });
    expect(incrementCounter({ date: today, shown: 1 }, now)).toEqual({ date: today, shown: 2 });
  });
});

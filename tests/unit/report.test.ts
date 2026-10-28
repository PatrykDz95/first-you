import { describe, expect, it } from 'vitest';
import { anonymousNumbers, highlights, mirror, summaryKey, topCategory, weekStats } from '../../src/report/compute';
import { buildCardSvg, wrap } from '../../src/report/card';
import { nextSundayAt18, weekRange, weekStart } from '../../src/core/time';
import type { PromptEvent } from '../../src/db/schema';

const wed = new Date(2026, 9, 28, 12, 0).getTime(); // Wednesday
let id = 0;
const ev = (over: Partial<PromptEvent> = {}): PromptEvent => ({
  id: ++id,
  createdAt: wed,
  site: 'chatgpt',
  category: 'other',
  topic: 'other',
  wordCount: 5,
  inConversation: false,
  shownWindow: false,
  decision: 'none',
  ...over,
});

describe('time', () => {
  it('week starts on local Monday 00:00', () => {
    const d = new Date(weekStart(wed));
    expect([d.getDay(), d.getHours(), d.getDate()]).toEqual([1, 0, 26]);
    const r = weekRange(wed, -1);
    expect(new Date(r.from).getDate()).toBe(19);
    expect(new Date(r.to).getDate()).toBe(26);
  });
  it('next report alarm is the coming Sunday 18:00, or next week if already past', () => {
    const n = new Date(nextSundayAt18(wed));
    expect([n.getDay(), n.getHours(), n.getDate()]).toEqual([0, 18, 1]);
    const sundayEvening = new Date(2026, 10, 1, 19, 0).getTime();
    expect(new Date(nextSundayAt18(sundayEvening)).getDate()).toBe(8);
  });
});

describe('weekStats', () => {
  const { from, to } = weekRange(wed);
  const events = [
    ev({ category: 'email', topic: 'writing', shownWindow: true, decision: 'review', taskType: 'write', outcome: 'ai_little' }),
    ev({ category: 'email', topic: 'writing', shownWindow: true, decision: 'attempt', taskType: 'write', outcome: 'ai_lot' }),
    ev({ category: 'math', topic: 'math', shownWindow: true, decision: 'attempt', taskType: 'estimate', outcome: 'hit' }),
    ev({ category: 'custom', customPhraseId: 'ct_1', shownWindow: true, decision: 'review' }),
    ev({ category: 'fact', topic: 'question', shownWindow: true, decision: 'skip' }),
    ev({ topic: 'code' }),
    ev({ createdAt: from - 1, decision: 'attempt', category: 'email' }), // last week
  ];
  const s = weekStats(events, from, to);

  it('counts tries, modes, outcomes and topics for the week only', () => {
    expect(s).toMatchObject({ prompts: 6, windows: 5, tries: 4, reviews: 2, compares: 2, skips: 1 });
    expect(s.triesByCategory).toEqual({ email: 2, math: 1, custom: 1 });
    expect(s.triesByPhrase).toEqual({ ct_1: 1 });
    expect(s.check).toEqual({ hit: 1, close: 0, miss: 0 });
    expect(s.edit).toEqual({ little: 1, lot: 1 });
    expect(s.topics.writing).toBe(2);
  });

  it('highlights only what has enough data, at most 3', () => {
    const prev = weekStats(events, ...Object.values(weekRange(wed, -1)) as [number, number]);
    const h = highlights(s, prev);
    expect(h[0]).toEqual({ kind: 'tries', value: 4, delta: 3 });
    expect(h.some((x) => x.kind === 'check')).toBe(false); // 1 rated < 3
    expect(topCategory(s)).toEqual({ category: 'email', count: 2 });
    expect(h.length).toBeLessThanOrEqual(3);
  });

  it('summary is neutral or positive in every case', () => {
    const empty = weekStats([], from, to);
    expect(summaryKey(empty, null)).toBe('quiet');
    expect(summaryKey(weekStats([ev()], from, to), null)).toBe('watching');
    expect(summaryKey(weekStats([ev({ shownWindow: true, decision: 'skip' })], from, to), null)).toBe('noTries');
    const sharp = weekStats(
      [1, 2, 3].map(() => ev({ decision: 'attempt', category: 'math', outcome: 'hit' })),
      from,
      to,
    );
    expect(summaryKey(sharp, null)).toBe('sharp');
    expect(summaryKey(s, weekStats([], from, to))).toBe('up');
  });

  it('mirror shares add up and skip empty topics', () => {
    const m = mirror(s);
    expect(m[0]!.topic).toBe('writing');
    expect(m.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1);
    expect(m.every((x) => x.count > 0)).toBe(true);
  });

  it('anonymous numbers contain no text or phrase ids', () => {
    const json = JSON.stringify(anonymousNumbers(s, '2026-10-26', '0.1.0'));
    expect(json).not.toContain('ct_1');
    expect(json).toContain('"tries":4');
  });
});

describe('share card', () => {
  it('escapes text and renders one block per line', () => {
    const svg = buildCardSvg({ title: 'A <b>', week: 'w', lines: [{ big: '4', small: 'x & y' }], footer: 'f' });
    expect(svg).toContain('A &lt;b&gt;');
    expect(svg).toContain('x &amp; y');
    expect(svg.match(/<g /g)?.length).toBe(1);
  });
  it('wraps long labels instead of overflowing into the next column', () => {
    expect(wrap('trafionych szacunków i strzałów', 18)).toEqual(['trafionych', 'szacunków i', 'strzałów']);
    expect(wrap('a b c d e f', 1, 2)).toEqual(['a', 'b…']);
  });
});

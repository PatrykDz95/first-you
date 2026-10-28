import { describe, expect, it } from 'vitest';
import { topicOf } from '../../src/classifier/topic';
import { format } from '../../locales';
import { en } from '../../locales/en';
import { pl } from '../../locales/pl';

describe('mirror topics (loose, stats only)', () => {
  it.each([
    ['Napisz post na LinkedIn o awansie', 'writing'],
    ['Przetłumacz to na angielski', 'translation'],
    ['Streść ten artykuł', 'summary'],
    ['Jak działa Kafka consumer group?', 'code'],
    ['TypeError: x is undefined', 'code'],
    ['Czy warto kupić elektryka?', 'decision'],
    ['ile to 15% z 80', 'math'],
    ['Kiedy była bitwa pod Grunwaldem?', 'question'],
    ['Hej', 'other'],
  ])('%s -> %s', (text, topic) => {
    expect(topicOf(text)).toBe(topic);
  });
});

describe('i18n', () => {
  it('Polish plurals', () => {
    const s = '{n} próba|{n} próby|{n} prób';
    expect(format('pl', s, { n: 1 })).toBe('1 próba');
    expect(format('pl', s, { n: 3 })).toBe('3 próby');
    expect(format('pl', s, { n: 5 })).toBe('5 prób');
    expect(format('pl', s, { n: 22 })).toBe('22 próby');
    expect(format('en', '{n} try|{n} tries', { n: 1 })).toBe('1 try');
    expect(format('en', '{n} try|{n} tries', { n: 0 })).toBe('0 tries');
  });
  it('PL and EN have exactly the same keys', () => {
    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
  });
});

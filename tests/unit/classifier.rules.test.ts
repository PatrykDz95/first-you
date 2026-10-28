import { describe, expect, it } from 'vitest';
import {
  classify,
  createTrigger,
  validateTrigger,
  AUTO_CATEGORIES,
  type AutoCategory,
  type ClassifyInput,
  type CustomTrigger,
} from '../../src/classifier';
import { normalize } from '../../src/classifier/normalize';

const base: ClassifyInput = {
  text: '',
  hasAttachments: false,
  practiceCategories: AUTO_CATEGORIES,
  customTriggers: [],
  ongoing: false,
};
const c = (text: string, over: Partial<ClassifyInput> = {}) => classify({ ...base, ...over, text });

describe('normalize', () => {
  it('strips Polish diacritics incl. ł', () => {
    expect(normalize('Przetłumacz ŻÓŁĆ  gęślą')).toBe('przetlumacz zolc gesla');
  });
});

describe('selected categories', () => {
  it('unselected categories never offer a window but are still recorded', () => {
    const r = c('Co to jest fotosynteza?', { practiceCategories: ['email'] as AutoCategory[] });
    expect(r.category).toBe('fact');
    expect(r.taskType).toBeNull();
    expect(r.reason).toBe('not_selected');
  });

  it('each category maps to its micro-task', () => {
    expect(c('Napisz maila do szefa o urlopie.').taskType).toBe('write');
    expect(c('Ile to jest 17 razy 23?').taskType).toBe('estimate');
    expect(c('Co to jest fotosynteza?').taskType).toBe('guess');
    expect(c('Czy powinienem zmienić pracę?').taskType).toBe('decide');
  });
});

describe('never show', () => {
  it('more than 400 words', () => {
    expect(c('Napisz maila ' + 'słowo '.repeat(400)).reason).toBe('too_long');
  });
  it('code blocks and inline code', () => {
    expect(c('What is `useEffect`?').reason).toBe('has_code');
    expect(c('Napisz maila\n```\nx\n```').reason).toBe('has_code');
  });
  it('attachments', () => {
    expect(c('Co to jest fotosynteza?', { hasAttachments: true }).reason).toBe('has_attachments');
  });
});

describe('ongoing conversation', () => {
  it('"Co to jest X?" in a new conversation is a fact, not a reference', () => {
    const r = c('Co to jest fotosynteza?', { ongoing: false });
    expect(r.category).toBe('fact');
    expect(r.taskType).toBe('guess');
  });

  it('short prompts mid-conversation stay silent', () => {
    expect(c('Co to jest fotosynteza?', { ongoing: true }).reason).toBe('ongoing_short');
  });

  it('unknown (null) is treated as ongoing', () => {
    expect(c('Co to jest fotosynteza?', { ongoing: null }).taskType).toBeNull();
  });

  it('references to earlier messages stay silent even when long', () => {
    const long = 'Napisz maila do zespołu na podstawie twojej odpowiedzi, ale bardziej formalnie i krócej proszę.';
    expect(c(long, { ongoing: true }).reason).toBe('ongoing_reference');
    expect(
      c('Should I go with the option from your answer or pick something cheaper for the whole team?', {
        ongoing: true,
      }).reason,
    ).toBe('ongoing_reference');
  });

  it('reference phrases like "podsumuj to" / "skróć to" never fire mid-conversation', () => {
    for (const t of ['podsumuj to', 'skróć to', 'a po angielsku?', 'summarize this', 'shorten it'])
      expect(c(t, { ongoing: true }).taskType).toBeNull();
  });

  it('standalone ≥12-word prompt mid-conversation can still fire', () => {
    const r = c('Kim był Mikołaj Kopernik i dlaczego jego teoria była tak ważna dla nauki?', { ongoing: true });
    expect(r.category).toBe('fact');
    expect(r.taskType).toBe('guess');
  });
});

describe('custom triggers', () => {
  const t = (phrase: string, type: CustomTrigger['taskType'] = 'general') => createTrigger(phrase, type, 1);

  it('match is case- and diacritics-insensitive, whole phrase as word run', () => {
    const triggers = [t('przetłumacz', 'write'), t('post na LinkedIn')];
    expect(c('Przetlumacz to na angielski', { customTriggers: triggers }).taskType).toBe('write');
    expect(c('Napisz POST NA linkedin o awansie', { customTriggers: triggers }).category).toBe('custom');
    expect(c('Napisz post o LinkedIn', { customTriggers: triggers }).category).not.toBe('custom');
    expect(c('przetłumaczony tekst', { customTriggers: triggers }).category).not.toBe('custom');
  });

  it('works mid-conversation and for unselected categories', () => {
    const triggers = [t('wymyśl nazwę', 'guess')];
    const r = c('wymyśl nazwę', { customTriggers: triggers, ongoing: true, practiceCategories: [] });
    expect(r.category).toBe('custom');
    expect(r.customTriggerId).toBe(triggers[0]!.id);
    expect(r.taskType).toBe('guess');
  });

  it('"never" rules still apply', () => {
    const triggers = [t('przetłumacz')];
    expect(c('przetłumacz `foo`', { customTriggers: triggers }).taskType).toBeNull();
  });

  it('validation', () => {
    expect(validateTrigger('   ', [])).toBe('empty');
    expect(validateTrigger('x'.repeat(61), [])).toBe('too_long');
    expect(validateTrigger('Przetłumacz', [t('przetlumacz')])).toBe('duplicate');
    expect(validateTrigger('nowa', Array.from({ length: 50 }, (_, i) => t(`f${i}`)))).toBe('too_many');
    expect(validateTrigger('wymyśl nazwę', [])).toBeNull();
  });
});

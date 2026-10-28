import type { TaskType } from '../classifier/types';
import type { Lang } from '../../locales';
import { outcomeGroup } from './outcome';

/**
 * Review mode: the user's own version goes to the AI with the original request, asking for
 * feedback instead of a rewrite. The original prompt is kept verbatim at the top.
 * Sent only after an explicit click; this is the one case where the prompt is changed.
 */


const TEMPLATES: Record<Lang, { intro: string; check: string; feedback: string }> = {
  pl: {
    intro: 'Zanim zapytałem, spróbowałem sam. Moja wersja:',
    check: 'Najpierw powiedz, czy moja wersja jest trafna i co ewentualnie pominąłem, a dopiero potem odpowiedz.',
    feedback:
      'Najpierw oceń moją wersję: co jest dobre, czego brakuje, co poprawić. Nie pisz jej od nowa, chyba że o to poproszę.',
  },
  en: {
    intro: 'Before asking, I tried it myself. My version:',
    check: 'First tell me whether my version is right and what I missed, then answer.',
    feedback:
      'First review my version: what works, what’s missing, what to improve. Don’t rewrite it unless I ask.',
  },
};

/** Template language follows the prompt, not the UI: Polish diacritics -> PL, common English words -> EN. */
export function reviewLang(original: string, attempt: string, uiLang: Lang): Lang {
  const text = `${original} ${attempt}`;
  if (/[ąćęłńóśźż]/i.test(text)) return 'pl';
  if (/\b(the|and|my|is|are|what|how|why|should|write|to|of)\b/i.test(text)) return 'en';
  return uiLang;
}

export function buildReviewPrompt(original: string, attempt: string, taskType: TaskType, lang: Lang): string {
  const t = TEMPLATES[lang];
  const instruction = outcomeGroup(taskType) === 'check' ? t.check : t.feedback;
  return `${original.trim()}\n\n---\n${t.intro}\n${attempt.trim()}\n\n${instruction}`;
}

/** Which button is primary (and what Enter does) for a given task. */
export function primaryDecision(taskType: TaskType): 'review' | 'attempt' {
  return taskType === 'estimate' || taskType === 'guess' ? 'attempt' : 'review';
}

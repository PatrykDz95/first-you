import { en, type MessageKey } from './en';
import { pl } from './pl';
import type { LanguagePref } from '../src/settings/types';

export type Lang = 'pl' | 'en';
export type { MessageKey };

const DICTS: Record<Lang, Record<MessageKey, string>> = { pl, en };

/**
 * Own tiny i18n instead of chrome.i18n: the language can be switched PL/EN at runtime in settings,
 * which chrome.i18n can't do (it always follows the browser UI language).
 */
export function resolveLang(pref: LanguagePref, browserLang = globalThis.navigator?.language ?? 'en'): Lang {
  if (pref !== 'auto') return pref;
  return browserLang.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export type Vars = Record<string, string | number>;

/**
 * "{n} próba|{n} próby|{n} prób" -> plural form picked by `vars.n` (PL: one|few|many, EN: one|other),
 * then {placeholders} filled in.
 */
export function format(lang: Lang, str: string, vars: Vars = {}): string {
  let s = str;
  if (s.includes('|') && typeof vars.n === 'number') {
    const forms = s.split('|');
    const cat = new Intl.PluralRules(lang).select(vars.n);
    const idx = lang === 'pl' ? ({ one: 0, few: 1, many: 2 } as Record<string, number>)[cat] ?? 2 : cat === 'one' ? 0 : 1;
    s = forms[Math.min(idx, forms.length - 1)]!;
  }
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translator(lang: Lang) {
  return (key: MessageKey) => DICTS[lang][key];
}

export function i18n(lang: Lang) {
  return {
    lang,
    t: (key: MessageKey) => DICTS[lang][key],
    tf: (key: MessageKey, vars: Vars) => format(lang, DICTS[lang][key], vars),
  };
}

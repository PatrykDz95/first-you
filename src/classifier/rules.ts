import type { AutoCategory } from './types';
import type { KeywordSet } from './keywordTypes';
import { countWords, normalize as normalizeLine } from './normalize';
import { KEYWORDS_PL } from './keywords.pl';
import { KEYWORDS_EN } from './keywords.en';
import { REFERENCES_PL } from './references.pl';
import { REFERENCES_EN } from './references.en';
import { isDebug } from './debug';

const SETS: KeywordSet[] = [KEYWORDS_PL, KEYWORDS_EN];
const END = '(?![\\p{L}\\p{N}])';
const START = '(?<![\\p{L}\\p{N}])';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Longest first, so "ile to jest" wins over "ile to". */
const alt = (list: readonly string[]) =>
  [...new Set(list)].sort((a, b) => b.length - a.length).map(escape).join('|');
const pick = (f: (k: KeywordSet) => readonly string[]) => SETS.flatMap(f);
const re = (src: string) => new RegExp(src, 'u');

// ---------- compiled patterns ----------

const LEAD_IN = re(`^(?:(?:${alt(pick((k) => k.leadIns))})(?:[\\s,!.:?]+|$))+`);

const EMAIL_WRITE = re(
  `^(?:${alt(pick((k) => k.email.writeVerbs))})(?: (?:${alt(pick((k) => k.email.fillers))})){0,4} (?:${alt(
    pick((k) => k.email.nouns),
  )})${END}`,
);
const EMAIL_REPLY = re(
  `^(?:${alt(pick((k) => k.email.replyVerbs))})(?: (?:${alt(pick((k) => k.email.determiners))}))?(?: (?:${alt(
    pick((k) => k.email.fillers),
  )})){0,2} (?:${alt(pick((k) => k.email.nouns))})${END}`,
);
const standalone = pick((k) => k.email.standaloneStarts);
const EMAIL_STANDALONE = standalone.length ? re(`^(?:${alt(standalone)})${END}`) : null;

const MATH_START = re(`^(?:${alt(pick((k) => k.math.starts))})${END}`);
const MATH_EXPR_START = re(`^(?:${alt(pick((k) => k.math.expressionStarts))})${END}`);
const EXPR_WORDS = re(`${START}(?:${alt(pick((k) => k.math.expressionWords))})${END}`);
const EXPR_WORDS_G = new RegExp(EXPR_WORDS.source, 'gu');
const NUMBER_G = /\d+(?:[.,]\d+)?/g;
const OPERATOR = /[+\-*/×÷^%]|\d\s*x\s*\d|(?<![\p{L}])(?:razy|plus|minus|przez|times|divided|of|z|procent|percent)(?![\p{L}])/u;

const FACT_START = re(`^(?:${alt(pick((k) => k.fact.starts))})${END}`);
const FACT_BLOCKED = re(`^(?:${alt(pick((k) => k.fact.blockedNext))})${END}`);
const FACT_WRAPPED = pick((k) => k.fact.wrapped.map((w) => `${escape(w.open)} (.+?) ${escape(w.close)}`)).map((src) =>
  re(`^${src}${END}`),
);
const FACT_TERM_START = re(`^(?:${alt(pick((k) => k.fact.termStarts))})${END}`);
/** "define a / the / this …" is almost always code or a task, not a term. */
const TERM_BLOCKED = re(`^(?:a|an|the|${alt(pick((k) => k.fact.blockedNext))})${END}`);
const MAX_TERM_WORDS = 4;

const SUMMARY_VERB = re(`${START}(?:${alt(pick((k) => k.summary.verbs))})`);

const DECISION_START = re(`^(?:${alt(pick((k) => k.decision.starts))})${END}`);

const REF_PHRASE = re(`${START}(?:${alt([...REFERENCES_PL.phrases, ...REFERENCES_EN.phrases])})${END}`);
const REF_PREFIX = re(`${START}(?:${alt([...REFERENCES_PL.prefixes, ...REFERENCES_EN.prefixes])})`);
const REF_START = re(`^(?:${alt([...REFERENCES_PL.starts, ...REFERENCES_EN.starts])})${END}`);

// ---------- helpers ----------

export function stripLeadIns(normalized: string): string {
  return normalized.replace(LEAD_IN, '').trim();
}

export function countNumbers(text: string): number {
  return text.match(NUMBER_G)?.length ?? 0;
}

/** "17*23", "15% z 80", "1250 zl * 1.23" — numbers, operators and a few glue words only. */
export function isPureExpression(normalized: string): boolean {
  if (countNumbers(normalized) < 2 || !OPERATOR.test(normalized)) return false;
  const rest = normalized
    .replace(NUMBER_G, ' ')
    .replace(EXPR_WORDS_G, ' ')
    .replace(/[+\-*/×÷^()=?.,%:!$€x\s]/g, '');
  return rest.length === 0;
}

/** Code blocks, inline code, or several lines that end like code. */
export function hasCode(text: string): boolean {
  if (text.includes('```')) return true;
  if (/`[^`\n]+`/.test(text)) return true;
  const codeLines = text.split('\n').filter((l) => /[;{}]\s*$/.test(l.trim()) && l.trim().length > 1);
  return codeLines.length >= 2;
}

/** Lines, normalized, empty ones dropped. */
function lines(text: string): { raw: string; norm: string }[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, norm: stripLeadIns(normalizeLine(raw)) }));
}

const firstWords = (s: string, n: number) => s.split(' ').slice(0, n).join(' ');

/**
 * Summary needs an instruction line (first or last) with the verb near its start,
 * plus a pasted body of 50-300 words.
 */
export function isSummary(text: string): boolean {
  const ls = lines(text);
  if (ls.length === 0) return false;

  const instructionAt = (l: { raw: string; norm: string }) => {
    const beforeColon = l.norm.split(':')[0] ?? '';
    return countWords(beforeColon) <= 20 && SUMMARY_VERB.test(firstWords(l.norm, 8));
  };

  const first = ls[0]!;
  if (instructionAt(first)) {
    const colon = first.raw.indexOf(':');
    const inline = colon >= 0 ? first.raw.slice(colon + 1) : '';
    const body = [inline, ...ls.slice(1).map((l) => l.raw)].join('\n');
    const n = countWords(body);
    if (n >= 50 && n <= 300) return true;
  }
  if (ls.length > 1) {
    const last = ls[ls.length - 1]!;
    if (instructionAt(last)) {
      const n = countWords(ls.slice(0, -1).map((l) => l.raw).join('\n'));
      if (n >= 50 && n <= 300) return true;
    }
  }
  return false;
}

/** Detects an automatic category from strong signals only. Order matters. */
export function detectCategory(text: string, normalized: string): AutoCategory | null {
  // First: a pasted error also contains words that would match other rules.
  if (isDebug(text)) return 'debug';
  if (isSummary(text)) return 'summary';

  const head = stripLeadIns(normalized);
  const words = countWords(text);

  if (EMAIL_WRITE.test(head) || EMAIL_REPLY.test(head) || EMAIL_STANDALONE?.test(head)) return 'email';

  if (isPureExpression(head)) return 'math';
  const exprStart = head.match(MATH_EXPR_START);
  if (exprStart && isPureExpression(head.slice(exprStart[0].length).trim())) return 'math';
  if (MATH_START.test(head) && countNumbers(head) >= 2 && words <= 25) return 'math';

  if (DECISION_START.test(head)) return 'decision';

  if (words <= 15) {
    const fact = head.match(FACT_START);
    if (fact) {
      const rest = head.slice(fact[0].length).replace(/^[\s,:]+/, '');
      if (rest && countWords(rest) >= 1 && !FACT_BLOCKED.test(rest)) return 'fact';
    }
    for (const w of FACT_WRAPPED) {
      const m = head.match(w);
      if (m && !FACT_BLOCKED.test(m[1]!)) return 'fact';
    }
    const term = head.match(FACT_TERM_START);
    if (term) {
      const rest = head.slice(term[0].length).replace(/^[\s,:]+/, '').replace(/[.?!]+$/, '').trim();
      const n = countWords(rest);
      if (n >= 1 && n <= MAX_TERM_WORDS && !TERM_BLOCKED.test(rest)) return 'fact';
    }
  }

  return null;
}

/** Does the prompt point back to earlier parts of the conversation? Checks first and last line. */
export function hasReference(text: string): boolean {
  const ls = lines(text);
  const candidates = [ls[0], ls.length > 1 ? ls[ls.length - 1] : undefined].filter(
    (l): l is { raw: string; norm: string } => !!l,
  );
  return candidates.some((l) => {
    const head = firstWords(l.norm, 30);
    return REF_START.test(head) || REF_PHRASE.test(head) || REF_PREFIX.test(head);
  });
}

/**
 * Keyword lists are written in NORMALIZED form: lowercase, no Polish diacritics
 * ("ł" -> "l", "ś" -> "s"), single spaces. See normalize.ts.
 *
 * Rule of thumb when editing: only add signals that are unambiguous on their own.
 * The classifier is tuned for precision, not recall. When in doubt, leave it out.
 */
export interface KeywordSet {
  /** Polite openers stripped before "starts with" checks. */
  leadIns: string[];
  email: {
    /** Verb that opens a request to write something ("napisz", "write"). */
    writeVerbs: string[];
    /** Words allowed between the verb and the noun ("krotkiego", "a short"). Anything else breaks the match. */
    fillers: string[];
    /** What is being written. A bare "mail" somewhere in the prompt is never enough. */
    nouns: string[];
    /** "reply to <noun>" style openers; matched as: verb + optional determiner/fillers + noun. */
    replyVerbs: string[];
    determiners: string[];
    /** Openers that are strong on their own ("odpisz"). */
    standaloneStarts: string[];
  };
  math: {
    /** Opener + at least two numbers in the prompt. */
    starts: string[];
    /** Opener whose remainder must be a pure arithmetic expression ("what is 15% of 80"). */
    expressionStarts: string[];
    /** Words allowed inside a pure arithmetic expression. */
    expressionWords: string[];
  };
  fact: {
    starts: string[];
    /** If the word right after the opener is one of these, it is not a fact question. */
    blockedNext: string[];
    /** Opener + term + closer, e.g. "what does <idempotent> mean". The term goes through blockedNext. */
    wrapped: { open: string; close: string }[];
    /**
     * Opener + a short term (1-4 words) and nothing else, e.g. "define entropy". Kept strict because
     * "define a function that…" is a coding request, not a fact question.
     */
    termStarts: string[];
  };
  summary: {
    /** Instruction words; also needs pasted text of 50-300 words. */
    verbs: string[];
  };
  decision: {
    starts: string[];
  };
}

// "ł" has no Unicode decomposition, so NFD alone would leave it untouched.
const SPECIAL: Record<string, string> = { ł: 'l', Ł: 'l' };

/** Lowercase, strip diacritics (incl. Polish), unify quotes/dashes, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .replace(/[łŁ]/g, (c) => SPECIAL[c] ?? c)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words = runs of letters/digits (apostrophes and hyphens kept inside words). */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Tokens for phrase matching: normalized words only, punctuation dropped. */
export function tokenize(normalized: string): string[] {
  return normalized.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
}

/** True if `needle` tokens appear as a contiguous run inside `haystack` tokens. */
export function containsTokenRun(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

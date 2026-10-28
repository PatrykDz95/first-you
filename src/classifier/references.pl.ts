/**
 * Phrases that point back to earlier parts of the conversation.
 * Normalized form (see normalize.ts). Phrases, not single words, so that
 * "co to jest fotosynteza" is never read as a reference.
 */
export const REFERENCES_PL = {
  phrases: [
    'podsumuj to', 'stresc to', 'skroc to', 'przetlumacz to', 'popraw to', 'ten tekst', 'tego tekstu',
    'twoja odpowiedz', 'twojej odpowiedzi', 'twoja wersja', 'jeszcze raz', 'a po angielsku', 'a po polsku',
    'to samo', 'wyzej', 'powyzej',
  ],
  /** Word prefixes, e.g. "powyzsz" matches "powyzszy", "powyzszego". */
  prefixes: ['powyzsz', 'poprzedni'],
  /** Prompt starts with one of these. */
  starts: ['skroc', 'rozwin', 'popraw', 'przepisz', 'zmien', 'a teraz', 'teraz'],
};

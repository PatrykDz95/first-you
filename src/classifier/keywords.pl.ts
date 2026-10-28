import type { KeywordSet } from './keywordTypes';

export const KEYWORDS_PL: KeywordSet = {
  leadIns: [
    'prosze', 'prosze cie', 'czy mozesz', 'czy moglbys', 'czy moglabys', 'mozesz', 'moglbys', 'moglabys',
    'pomoz mi', 'hej', 'hejka', 'czesc', 'siema', 'dzien dobry', 'szybkie pytanie',
  ],
  email: {
    writeVerbs: [
      'napisz', 'przygotuj', 'zredaguj', 'sformuluj', 'skrobnij', 'napisac', 'przygotowac', 'zredagowac',
      'sformulowac', 'napisalbys', 'napisalabys',
    ],
    fillers: [
      'mi', 'za mnie', 'krotki', 'krotkiego', 'krotka', 'uprzejmy', 'uprzejmego', 'uprzejma', 'grzeczny',
      'grzecznego', 'grzeczna', 'formalny', 'formalnego', 'formalna', 'oficjalny', 'oficjalnego', 'oficjalna',
      'szybki', 'szybkiego', 'szybka', 'prosty', 'prostego', 'prosta', 'profesjonalny', 'profesjonalnego',
      'profesjonalna', 'mily', 'milego', 'mila', 'zwiezly', 'zwiezlego', 'zwiezla', 'kulturalny',
      'kulturalnego', 'kulturalna', 'krotkie', 'uprzejme', 'grzeczne',
    ],
    nouns: [
      'mail', 'maila', 'e-mail', 'e-maila', 'email', 'emaila', 'wiadomosc', 'wiadomosci', 'sms', 'smsa',
      'esemesa', 'odpowiedz do', 'odpowiedz na', 'liscik', 'przypomnienie do', 'podziekowanie dla',
      'podziekowania dla', 'przeprosiny dla',
    ],
    replyVerbs: ['odpowiedz na', 'odpowiedz do'],
    determiners: ['ten', 'tego', 'jego', 'jej', 'ich', 'moj', 'mojego'],
    standaloneStarts: ['odpisz'],
  },
  math: {
    starts: [
      'policz', 'oblicz', 'przelicz', 'wylicz', 'ile to jest', 'ile to', 'ile jest', 'ile wynosi', 'ile bedzie',
    ],
    expressionStarts: ['ile to jest', 'ile to', 'ile jest', 'ile wynosi', 'ile bedzie'],
    expressionWords: [
      'razy', 'plus', 'minus', 'podzielic', 'podzielone', 'przez', 'do', 'potegi', 'kwadrat', 'procent', 'z',
      'zl', 'pln', 'eur', 'euro', 'usd', 'i',
    ],
  },
  fact: {
    starts: [
      'co to jest', 'co to sa', 'co to znaczy', 'co oznacza', 'czym jest', 'czym sa', 'czym byl', 'czym byla',
      'kim byl', 'kim byla', 'kim jest', 'kim sa', 'kim byli', 'kto to byl', 'kto to byla', 'kto wynalazl',
      'kto napisal', 'kto odkryl', 'kto wymyslil', 'kto namalowal', 'kto skomponowal',
    ],
    blockedNext: [
      'to', 'ten', 'ta', 'tamto', 'tutaj', 'tu', 'za', 'twoj', 'twoja', 'twoje', 'moj', 'moja', 'moje',
      'najlepszy', 'najlepsza', 'najlepsze', 'lepsze', 'lepszy', 'lepsza', 'zle', 'nie', 'dzisiaj', 'dzis',
      'teraz', 'ze', 'pogoda', 'godzina',
    ],
    wrapped: [],
    termStarts: ['zdefiniuj', 'definicja', 'definicje'],
  },
  summary: {
    verbs: ['stresc', 'streszcz', 'podsumuj', 'podsumowanie', 'zrob streszczenie', 'zrob podsumowanie'],
  },
  decision: {
    starts: [
      'co wybrac', 'co lepiej wybrac', 'co mam wybrac', 'co powinienem wybrac', 'co powinnam wybrac',
      'czy powinienem', 'czy powinnam', 'czy warto',
    ],
  },
};

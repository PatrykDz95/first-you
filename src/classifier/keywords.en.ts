import type { KeywordSet } from './keywordTypes';

export const KEYWORDS_EN: KeywordSet = {
  leadIns: [
    'please', 'pls', 'can you', 'could you', 'would you', 'can u', 'help me', 'i need you to', 'hey', 'hi',
    'hello', 'quick question',
  ],
  email: {
    writeVerbs: ['write', 'draft', 'compose'],
    fillers: [
      'me', 'a', 'an', 'the', 'short', 'quick', 'brief', 'polite', 'formal', 'professional', 'friendly', 'nice',
      'follow-up', 'followup', 'follow', 'up', 'thank', 'you', 'thank-you', 'kind', 'simple', 'concise',
      'reminder', 'apology', 'slack', 'linkedin', 'whatsapp',
    ],
    nouns: ['email', 'e-mail', 'mail', 'message', 'reply', 'text message', 'dm', 'note to'],
    replyVerbs: ['reply to', 'respond to', 'answer'],
    determiners: ['this', 'that', 'the', 'my', 'his', 'her', 'their', 'a', 'an'],
    standaloneStarts: [],
  },
  math: {
    starts: ['calculate', 'compute', 'work out', 'how much is', 'how much are', 'multiply', 'divide', 'add up'],
    expressionStarts: ['what is', "what's", 'whats', 'how much is'],
    expressionWords: [
      'times', 'plus', 'minus', 'divided', 'by', 'of', 'to', 'the', 'power', 'squared', 'percent', 'and',
      'usd', 'eur',
    ],
  },
  fact: {
    starts: [
      'what is', 'what are', "what's", 'whats', 'what was', 'what were', 'who is', 'who was', 'who were',
      'who invented', 'who wrote', 'who discovered', 'who painted', 'who composed',
    ],
    blockedNext: [
      'this', 'that', 'it', 'these', 'those', 'your', 'my', 'best', 'wrong', 'happening', 'going', 'up',
      'the best', 'better', 'weather', 'time', 'today', 'now', 'next', 'here', 'a good', 'the right',
      'the weather', 'the time', 'the date', 'the problem', 'the issue', 'the error',
    ],
    wrapped: [
      { open: 'what does', close: 'mean' },
      { open: 'what do', close: 'mean' },
    ],
    termStarts: ['define', 'definition of', 'meaning of'],
  },
  summary: {
    verbs: ['summarize', 'summarise', 'sum up', 'summary', 'tldr', 'tl;dr'],
  },
  decision: {
    starts: [
      'should i', 'which should i', 'which one should i', 'what should i choose', 'what should i pick',
      'is it worth', 'which is better', 'which one is better', 'what to choose', 'what to pick',
    ],
  },
};

import { normalize } from './normalize';
import { hasCode } from './rules';
import { isDebug } from './debug';

/**
 * Loose topic, ONLY for the report's mirror ("40% of your prompts are writing").
 * It never opens a window, so it can afford to be broad: the strict classifier would leave
 * most prompts as "other" and the mirror would say nothing.
 */
export const TOPICS = ['code', 'translation', 'summary', 'writing', 'decision', 'math', 'question', 'other'] as const;
export type Topic = (typeof TOPICS)[number];

const W = (words: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${words})`, 'u');

const RULES: [Topic, RegExp][] = [
  ['code', W('kod|funkcj|klas[aey]|bug|bledu?|blad|regex|sql|api|endpoint|python|java(script)?|typescript|kotlin|golang|rust|react|spring|docker|kubernetes|k8s|kafka|git|linux|bash|npm|maven|gradle|terraform|aws|css|html|json|yaml|postgres|mongo|redis|elasticsearch|rabbitmq|code|function|class|stack ?trace|exception|compile')],
  ['translation', W('przetlumacz|tlumaczeni|po angielsku|po polsku|na angielski|na polski|translate|translation|in english|in polish|into english')],
  ['summary', W('stresc|streszcz|podsumuj|podsumowani|summari[sz]e|summary|tl;?dr|sum up')],
  ['writing', W('napisz|przepisz|zredaguj|popraw|sformuluj|wiadomosc|mail|post|list motywacyjny|cv\\b|wypracowani|esej|write|rewrite|draft|proofread|edit|email|essay|cover letter|message|caption|tweet')],
  ['decision', W('co wybrac|czy powinienem|czy powinnam|czy warto|co lepsze|lepszy|lepsza|should i|which is better|which one|worth it|vs\\.?')],
  ['math', W('policz|oblicz|ile to|ile wynosi|procent|calculate|compute|how much is|percent')],
  ['question', /^(co|kto|kiedy|gdzie|dlaczego|czemu|jak|ile|czy|jaki|jaka|jakie|what|who|when|where|why|how|is|are|does|do|can|which)\b/u],
];

export function topicOf(text: string): Topic {
  if (hasCode(text) || isDebug(text)) return 'code';
  const n = normalize(text);
  if (/\d\s*[+\-*/×÷^%]\s*\d/.test(n)) return 'math';
  for (const [topic, re] of RULES) if (re.test(n)) return topic;
  if (n.trim().endsWith('?')) return 'question';
  return 'other';
}

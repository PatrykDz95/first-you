/**
 * "debug" category: the prompt contains a pasted error message or stack trace.
 * Language-independent, so the signals live here rather than in keywords.*.ts.
 * Tuned for precision: an error class merely mentioned in a sentence ("throws
 * IllegalArgumentException: when…") must not count, so headers must start a line.
 */

/** Lines of a stack trace. Two or more = pasted trace. */
const STACK_LINES: RegExp[] = [
  /^\s*at\s+.+:\d+(?::\d+)?\)?\s*$/, // Java, JS/Node, C#: "at com.x.Y.z(Y.java:12)", "at f (file.js:1:2)"
  /^\s*File ".+", line \d+/, // Python
  /^\s*\S+\.go:\d+/, // Go
  /^\s*-->\s+\S+:\d+:\d+/, // Rust
  /^goroutine \d+ \[/, // Go
];

/** Error headers. Anchored to the start of a line: pasted output, not a mention inside a sentence. */
const HEADERS: RegExp[] = [
  /^\s*Error: \S/, // Node: "Error: ENOENT: …"
  /^\s*(?:[a-z_][\w$]*\.)*[A-Z][\w$]*(?:Exception|Error)(?::\s|\s*$)/, // TypeError: …, java.lang.NullPointerException: …
  /^\s*Traceback \(most recent call last\)/,
  /^\s*panic: /,
  /^\s*error\[E\d{4}\]/,
  /^\s*\[?(?:ERROR|FATAL)\]?[\s:]/,
];

/** Unambiguous anywhere in the prompt. */
const ANYWHERE: RegExp[] = [/\bUncaught (?:\(in promise\) )?\w*Error\b/, /\bSegmentation fault\b/];

export function isDebug(text: string): boolean {
  if (ANYWHERE.some((r) => r.test(text))) return true;
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^```\w*\s*/, ''));
  const stackLines = lines.filter((l) => STACK_LINES.some((r) => r.test(l))).length;
  if (stackLines >= 2) return true;
  return lines.some((line) => HEADERS.some((r) => r.test(line)));
}

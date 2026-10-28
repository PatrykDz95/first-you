export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** Local calendar date, YYYY-MM-DD. */
export function localDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local Monday 00:00 of the week containing ts. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

/** [Monday 00:00, next Monday 00:00) in local time; DST-safe (calendar arithmetic). */
export function weekRange(ts: number, offsetWeeks = 0): { from: number; to: number } {
  const from = new Date(weekStart(ts));
  from.setDate(from.getDate() + 7 * offsetWeeks);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.getTime(), to: to.getTime() };
}

/** Next Sunday 18:00 local strictly after `now`. */
export function nextSundayAt18(now: number): number {
  const d = new Date(now);
  const target = new Date(d);
  target.setHours(18, 0, 0, 0);
  target.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  if (target.getTime() <= now) target.setDate(target.getDate() + 7);
  return target.getTime();
}

/**
 * Local date/time helpers.
 *
 * `new Date().toISOString().split('T')[0]` returns the *UTC* date. In South Africa
 * (UTC+2) that is yesterday's date between 00:00 and 02:00 local time, which made
 * sales and shift closings land on the wrong day. These helpers use the machine's
 * local clock, which is what a till must record.
 */

const pad = (value: number): string => String(value).padStart(2, '0');

/** `YYYY-MM-DD` in local time. */
export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `HH:MM:SS` in local time. */
export function localTime(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Full ISO-like local timestamp without timezone shifting: `YYYY-MM-DDTHH:MM:SS`. */
export function localDateTime(date: Date = new Date()): string {
  return `${localDate(date)}T${localTime(date)}`;
}

/** `YYYY-MM` month key in local time. */
export function localMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Parses `YYYY-MM-DD` or a full timestamp as a *local* instant. */
export function parseLocal(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  const parsed = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** First and last day of the current local calendar year, used as report defaults. */
export function currentYearRange(now: Date = new Date()): { from: string; to: string } {
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
}

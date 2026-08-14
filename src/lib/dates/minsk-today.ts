/** Product calendar day uses fixed Europe/Minsk (ADR-0004), not device TZ. */

const MINSK = "Europe/Minsk";

/**
 * Calendar date YYYY-MM-DD for `at` (default now) in Europe/Minsk.
 * Used as default Occurred on when capture omits a date.
 */
export function todayInMinsk(at: Date = new Date()): string {
  // en-CA yields ISO-like YYYY-MM-DD in the given timeZone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MINSK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Next calendar day after product today in Europe/Minsk.
 * Set Opening may use this as the latest allowed Opening date.
 */
export function tomorrowInMinsk(at: Date = new Date()): string {
  return addCalendarDays(todayInMinsk(at), 1);
}

/** Shift a YYYY-MM-DD calendar day by `days` using UTC date math. */
export function addCalendarDays(iso: string, days: number): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

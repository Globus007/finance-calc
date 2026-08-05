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

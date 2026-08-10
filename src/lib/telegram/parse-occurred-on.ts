/**
 * Parse ForceReply text for Occurred on (ADR-0010).
 * Accepts YYYY-MM-DD, D.M.YYYY / DD.MM.YYYY, «сегодня» / «вчера» (Europe/Minsk).
 */

import { todayInMinsk } from "@/lib/dates/minsk-today";
import { isValidCalendarDate } from "@/lib/draft/validate-commit";

/** Calendar day for `at` minus one product day in Europe/Minsk. */
export function yesterdayInMinsk(at: Date = new Date()): string {
  const today = todayInMinsk(at);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  const dt = new Date(Date.UTC(year, month - 1, day - 1));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse user reply into YYYY-MM-DD or null when invalid.
 * Relative words use Europe/Minsk wall calendar for `at`.
 */
export function parseOccurredOnReply(
  raw: string,
  at: Date = new Date(),
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === "сегодня" || lower === "today") {
    return todayInMinsk(at);
  }
  if (lower === "вчера" || lower === "yesterday") {
    return yesterdayInMinsk(at);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidCalendarDate(trimmed) ? trimmed : null;
  }

  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const day = dotted[1]!.padStart(2, "0");
    const month = dotted[2]!.padStart(2, "0");
    const year = dotted[3]!;
    const iso = `${year}-${month}-${day}`;
    return isValidCalendarDate(iso) ? iso : null;
  }

  return null;
}

/** Calendar month helpers for Europe/Minsk product calendar (ADR-0004). */

const MINSK = "Europe/Minsk";

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

/**
 * Current calendar year-month (YYYY-MM) in Europe/Minsk for `at` (default now).
 */
export function currentYearMonth(at: Date = new Date()): string {
  // en-CA yields ISO-like YYYY-MM-DD; take year-month only.
  return todayParts(at).slice(0, 7);
}

/**
 * Inclusive calendar-month bounds as YYYY-MM-DD date strings.
 * Used to filter Occurred on for live Monthly total (no TZ conversion of dates).
 */
export function monthDateBounds(yearMonth: string): {
  start: string;
  end: string;
} {
  const [yStr, mStr] = yearMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1–12
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid yearMonth: ${yearMonth}`);
  }
  const start = `${yearMonth}-01`;
  // Day 0 of next month = last day of this month (UTC date math on bare calendar).
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Shift a YYYY-MM by `delta` months (may cross year). */
export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [yStr, mStr] = yearMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1–12
  const idx = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(idx / 12);
  const nextMonth = (idx % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

/** Russian month label, e.g. «Август 2026». */
export function monthLabelRu(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split("-");
  const monthIndex = Number(mStr) - 1;
  return `${MONTH_NAMES_RU[monthIndex]} ${yStr}`;
}

function todayParts(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MINSK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

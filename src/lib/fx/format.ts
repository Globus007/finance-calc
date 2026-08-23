import type { EffectiveRate } from "./types";

/**
 * "$1 = 3,3012" — four fraction digits, comma separator (Settings Fx line).
 */
export function formatUsdRate(rate: number): string {
  const formatted = rate.toLocaleString("ru-BY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return `$1 = ${formatted}`;
}

/**
 * Full active-rate line for Settings (story #6):
 * "$1 = 3,3012 · NBRB 12.02" or "$1 = 3,35 · own".
 */
export function formatActiveRateLine(effective: EffectiveRate): string {
  const origin =
    effective.source === "override"
      ? "own"
      : `NBRB ${formatDayMonth(effective.asOf)}`;
  return `${formatUsdRate(effective.rate)} · ${origin}`;
}

/** "12.02" day.month from an ISO instant, in Europe/Minsk. */
function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("ru-BY", {
    day: "2-digit",
    timeZone: "Europe/Minsk",
  });
  const month = d.toLocaleDateString("ru-BY", {
    month: "2-digit",
    timeZone: "Europe/Minsk",
  });
  return `${day}.${month}`;
}

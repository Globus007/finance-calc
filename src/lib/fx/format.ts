import type { EffectiveRate, RateCurrency } from "./types";

/** "$1 = 3,0046" / "€1 = 3,5051" — four fraction digits, comma separator. */
export function formatRate(currency: RateCurrency, rate: number): string {
  const formatted = rate.toLocaleString("ru-BY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return `${unitOf(currency)}1 = ${formatted}`;
}

export function unitOf(currency: RateCurrency): "$" | "€" {
  return currency === "USD" ? "$" : "€";
}

/**
 * Full active-rate line for Settings:
 * "$1 = 3,3012 · НБРБ 12.02" or "$1 = 3,35 · свой".
 */
export function formatActiveRateLine(
  currency: RateCurrency,
  effective: EffectiveRate,
): string {
  const origin =
    effective.source === "override"
      ? "own"
      : `NBRB ${formatDayMonth(effective.asOf)}`;
  return `${formatRate(currency, effective.rate)} · ${origin}`;
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

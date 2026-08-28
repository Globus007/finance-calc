import type { Currency, EffectiveRate, RateCurrency } from "./types";

/**
 * Pure conversion helpers on top of the effective X→BYN rates. Nothing here
 * fetches: pages and actions resolve rates through the FX seam and inject them.
 */

export type RateMap = Partial<Record<RateCurrency, EffectiveRate>>;

/** BYN per one unit of `currency`; null when that rate is unavailable. */
export function rateToByn(
  currency: Currency,
  rates: RateMap,
): number | null {
  if (currency === "BYN") return 1;
  const effective = rates[currency];
  if (!effective || !Number.isFinite(effective.rate) || effective.rate <= 0) {
    return null;
  }
  return effective.rate;
}

/** numeric(12,4) — never round a rate to 2 dp. */
export function roundHalfUp4(value: number): number {
  return Math.round(Number(`${value}e4`)) / 10_000;
}

/** numeric(12,2) money, half-up. */
export function roundHalfUp2Money(value: number): number {
  return Math.round(Number(`${value}e2`)) / 100;
}

/**
 * Implied source→target rate from the two X→BYN rates (ADR-0014), rounded to
 * the four fraction digits the row stores. Null when either side is missing.
 */
export function crossRate(
  from: Currency,
  to: Currency,
  rates: RateMap,
): number | null {
  const fromByn = rateToByn(from, rates);
  const toByn = rateToByn(to, rates);
  if (fromByn === null || toByn === null || toByn <= 0) return null;
  const rate = roundHalfUp4(fromByn / toByn);
  return rate > 0 ? rate : null;
}

/**
 * Amount re-expressed in another Currency (Edit / Transfer prefill, «≈»).
 * Same Currency keeps the figure untouched; a missing rate returns null so the
 * caller can keep what the user typed instead of inventing a number.
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: RateMap,
): number | null {
  if (from === to) return amount;
  const rate = crossRate(from, to, rates);
  if (rate === null) return null;
  return roundHalfUp2Money(amount * rate);
}

/** Amount in BYN (canonical) from a native figure; null when no rate. */
export function toByn(
  amount: number,
  currency: Currency,
  rates: RateMap,
): number | null {
  const rate = rateToByn(currency, rates);
  if (rate === null) return null;
  return roundHalfUp2Money(amount * rate);
}

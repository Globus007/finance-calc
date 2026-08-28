/** FX seam (ADR-0013 + ADR-0014): effective per-Currency BYN rates + overrides. */

/** Every Currency the product knows. BYN is canonical and needs no rate. */
export type Currency = "BYN" | "USD" | "EUR";

/** Currencies that carry an Fx rate row (X→BYN). */
export type RateCurrency = "USD" | "EUR";

export const RATE_CURRENCIES: readonly RateCurrency[] = ["USD", "EUR"];

export function isRateCurrency(value: string): value is RateCurrency {
  return value === "USD" || value === "EUR";
}

export function isCurrency(value: string): value is Currency {
  return value === "BYN" || value === "USD" || value === "EUR";
}

export type FxSource = "nbrb" | "override";

/** Resolved rate used for one Commit/Edit-save/Transfer or one page render. */
export type EffectiveRate = {
  rate: number;
  source: FxSource;
  /** ISO instant the rate value was produced (fetch time / override time / cache time). */
  asOf: string;
};

/** Persisted per-(user, currency) state row (fx_rates table, camelCase mapping). */
export type FxState = {
  cachedRate: number | null;
  cachedAt: string | null;
  overrideRate: number | null;
  overrideAt: string | null;
};

/** Lazy refresh: NBRB fetch at most once per day per currency (spec #83/#85). */
export const DAILY_RATE_TTL_MS = 24 * 60 * 60 * 1000;

/** Original-typed snapshot kept on committed records entered in USD/EUR. */
export type AmountSnapshot = {
  currency: RateCurrency;
  originalAmount: number;
  fxRate: number;
};

/** Rates needed to convert one Currency to BYN (null for BYN itself). */
export function rateCurrencyOf(currency: Currency): RateCurrency | null {
  return currency === "BYN" ? null : currency;
}

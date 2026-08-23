/** FX seam (ADR-0013): effective USD→BYN rate resolution + manual override. */

export type Currency = "BYN" | "USD";

export type FxSource = "nbrb" | "override";

/** Resolved rate used for one Commit/Edit-save or one page render. */
export type EffectiveRate = {
  rate: number;
  source: FxSource;
  /** ISO instant the rate value was produced (fetch time / override time / cache time). */
  asOf: string;
};

/** Persisted per-user state row (fx_rates table, camelCase mapping). */
export type FxState = {
  cachedRate: number | null;
  cachedAt: string | null;
  overrideRate: number | null;
  overrideAt: string | null;
};

/** Lazy refresh: NBRB fetch at most once per day (spec #83). */
export const DAILY_RATE_TTL_MS = 24 * 60 * 60 * 1000;

/** Original-typed snapshot kept on committed records entered in USD. */
export type UsdSnapshot = {
  originalAmount: number;
  fxRate: number;
};

/**
 * FX module seam (ADR-0013, per-Currency since ADR-0014). Exactly two
 * operations: getEffectiveRate / setRateOverride, both keyed by Currency.
 * Rate is resolved server-side by actions/pages; components never fetch rates.
 * Client components that only need the pure conversion helpers must import
 * from `./client` instead — this barrel pulls in `server-state.ts` →
 * `next/headers`, which is illegal in a client bundle.
 */
import { fetchNbrbRate } from "./nbrb-client";
import { parseOverrideRate } from "./parse-override-rate";
import { resolveEffectiveRate } from "./resolve-rate";
import {
  loadFxState,
  saveFxCache,
  saveFxOverride,
} from "./server-state";
import type { EffectiveRate, RateCurrency } from "./types";
import { RATE_CURRENCIES } from "./types";

export type {
  AmountSnapshot,
  Currency,
  EffectiveRate,
  FxSource,
  RateCurrency,
} from "./types";
export {
  DAILY_RATE_TTL_MS,
  isCurrency,
  isRateCurrency,
  RATE_CURRENCIES,
  rateCurrencyOf,
} from "./types";
export { resolveEffectiveRate };
export { parseOverrideRate };
export {
  convertAmount,
  crossRate,
  rateToByn,
  roundHalfUp4,
  toByn,
  type RateMap,
} from "./convert";

/**
 * Effective X→BYN rate for the current session:
 * override > fresh-enough daily cache > lazy NBRB fetch > last cache.
 * Null when unauthenticated or no rate is available at all.
 */
export async function getEffectiveRate(
  currency: RateCurrency,
  /** Service-role caller (Telegram bot) resolving a rate for its user. */
  ownerId?: string,
): Promise<EffectiveRate | null> {
  const state = await loadFxState(currency, ownerId);
  if (!state) return null;
  return resolveEffectiveRate({
    state,
    now: new Date(),
    fetchNbrbRate: () => fetchNbrbRate(currency),
    saveCache: (rate, at) => saveFxCache(currency, rate, at, ownerId),
  });
}

/**
 * Effective rates for every non-BYN Currency (one render / one Transfer).
 * BYN is always 1:1 and never carries a rate row.
 */
export async function getEffectiveRates(
  ownerId?: string,
): Promise<Partial<Record<RateCurrency, EffectiveRate>>> {
  const entries = await Promise.all(
    RATE_CURRENCIES.map(async (currency) => {
      const rate = await getEffectiveRate(currency, ownerId);
      return [currency, rate] as const;
    }),
  );

  const out: Partial<Record<RateCurrency, EffectiveRate>> = {};
  for (const [currency, rate] of entries) {
    if (rate) out[currency] = rate;
  }
  return out;
}

/**
 * Set or clear the manual override for one Currency. Returns false when
 * unauthenticated or the write failed; callers surface that as an action error.
 */
export async function setRateOverride(
  currency: RateCurrency,
  rate: number | null,
  ownerId?: string,
): Promise<boolean> {
  return saveFxOverride(currency, rate, new Date(), ownerId);
}

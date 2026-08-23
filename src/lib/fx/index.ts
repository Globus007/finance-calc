/**
 * FX module seam (ADR-0013). Exactly two operations:
 * getEffectiveRate / setRateOverride. Rate is resolved server-side by
 * actions/pages; components never fetch or compute conversions.
 */
import { fetchNbrbUsdRate } from "./nbrb-client";
import { parseOverrideRate } from "./parse-override-rate";
import { resolveEffectiveRate } from "./resolve-rate";
import {
  loadFxState,
  saveFxCache,
  saveFxOverride,
} from "./server-state";
import type { EffectiveRate } from "./types";

export type { Currency, EffectiveRate, FxSource, UsdSnapshot } from "./types";
export { DAILY_RATE_TTL_MS } from "./types";
export { resolveEffectiveRate };
export { parseOverrideRate };

/**
 * Effective USD→BYN rate for the current session:
 * override > fresh-enough daily cache > lazy NBRB fetch > last cache.
 * Null when unauthenticated or no rate is available at all.
 */
export async function getEffectiveRate(): Promise<EffectiveRate | null> {
  const state = await loadFxState();
  if (!state) return null;
  return resolveEffectiveRate({
    state,
    now: new Date(),
    fetchNbrbRate: fetchNbrbUsdRate,
    saveCache: saveFxCache,
  });
}

/**
 * Set or clear the manual override. Returns false when unauthenticated or
 * the write failed; callers surface that as an action error.
 */
export async function setRateOverride(rate: number | null): Promise<boolean> {
  return saveFxOverride(rate, new Date());
}

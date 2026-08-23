import { DAILY_RATE_TTL_MS } from "./types";
import type { EffectiveRate, FxState } from "./types";

export type ResolveRateDeps = {
  /** Persisted state (cache + override); null before first write. */
  state: FxState | null;
  now: Date;
  /** Injected NBRB client — never fetched inside tests. */
  fetchNbrbRate: () => Promise<number | null>;
  /** Persist a fresh NBRB cache entry. */
  saveCache?: (rate: number, at: Date) => Promise<void>;
  ttlMs?: number;
};

/**
 * Effective USD→BYN resolution order (ADR-0013):
 * override > fresh-enough cache > lazy NBRB fetch > last cache fallback.
 * Returns null only when there is no override, no cache at all, and NBRB
 * is unreachable (first use offline) — USD features degrade until the user
 * enters an override or connectivity returns.
 */
export async function resolveEffectiveRate(
  deps: ResolveRateDeps,
): Promise<EffectiveRate | null> {
  const { state, now, fetchNbrbRate, ttlMs = DAILY_RATE_TTL_MS } = deps;

  if (
    state?.overrideRate != null &&
    Number.isFinite(state.overrideRate) &&
    state.overrideRate > 0
  ) {
    return {
      rate: state.overrideRate,
      source: "override",
      asOf: state.overrideAt ?? now.toISOString(),
    };
  }

  const cacheFresh =
    state?.cachedRate != null &&
    Number.isFinite(state.cachedRate) &&
    state.cachedRate > 0 &&
    !!state.cachedAt &&
    now.getTime() - Date.parse(state.cachedAt) < ttlMs;
  if (cacheFresh) {
    return {
      rate: state.cachedRate as number,
      source: "nbrb",
      asOf: state.cachedAt as string,
    };
  }

  const fetched = await fetchNbrbRate();
  if (fetched != null && Number.isFinite(fetched) && fetched > 0) {
    await deps.saveCache?.(fetched, now);
    return { rate: fetched, source: "nbrb", asOf: now.toISOString() };
  }

  if (state?.cachedRate != null && Number.isFinite(state.cachedRate) && state.cachedRate > 0) {
    // Stale cache still beats nothing (offline days keep working).
    return {
      rate: state.cachedRate,
      source: "nbrb",
      asOf: state.cachedAt ?? now.toISOString(),
    };
  }

  return null;
}

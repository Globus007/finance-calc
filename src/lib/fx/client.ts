/**
 * Client-safe slice of the FX seam (ADR-0013 / ADR-0014).
 *
 * Re-exports only the pure conversion helpers, formatting, and types — nothing
 * that touches `next/headers` or Supabase server state. Client components
 * (Edit, Transfer prefill) import from here so the `next/headers` graph in
 * `server-state.ts` never reaches a client bundle. Actions and pages keep
 * importing the full seam from `@/lib/fx`.
 */
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
export { resolveEffectiveRate } from "./resolve-rate";
export { parseOverrideRate } from "./parse-override-rate";
export {
  convertAmount,
  crossRate,
  rateToByn,
  roundHalfUp4,
  toByn,
  type RateMap,
} from "./convert";

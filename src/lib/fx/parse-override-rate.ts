/** Parse a user-typed rate override (> 0, fits numeric(12,4)). */
export const MAX_OVERRIDE_RATE = 99_999_999.9999;

export type OverrideRateValidation =
  | { ok: true; rate: number }
  | { ok: false; reason: "rate_required" | "rate_too_large" };

/**
 * Accepts "." or "," separators like the amount parser; rounds half-up to 4 dp.
 * Null/blank means "clear the override" and is handled by the caller.
 */
export function parseOverrideRate(raw: string): OverrideRateValidation {
  const trimmed = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!trimmed) return { ok: false, reason: "rate_required" };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, reason: "rate_required" };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "rate_required" };
  if (n > MAX_OVERRIDE_RATE) return { ok: false, reason: "rate_too_large" };
  const rounded = Math.round(Number(`${trimmed}e4`)) / 10_000;
  return { ok: true, rate: rounded };
}

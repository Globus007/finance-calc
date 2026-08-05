/**
 * Parse user Amount input for Commit.
 * Accepts "." or "," decimal separators; rounds half-up to 2 dp (BYN).
 * Returns null when missing, non-numeric, or ≤ 0.
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!trimmed) return null;
  // Reject scientific notation and trailing junk
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  // String exponent avoids binary float traps (e.g. 1.005 * 100).
  const rounded = Math.round(Number(`${trimmed}e2`)) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return null;
  return rounded;
}

/**
 * Parse user Opening amount input.
 * Accepts "." or "," ; rounds half-up to 2 dp (BYN).
 * Zero is allowed. Returns null for empty/junk; use `isNegativeOpeningAmount`
 * to distinguish a typed negative from junk.
 */
export function parseOpeningAmount(raw: string): number | null {
  const trimmed = normalizeAmountInput(raw);
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.round(Number(`${trimmed}e2`)) / 100;
  if (!Number.isFinite(rounded) || rounded < 0) return null;
  return rounded;
}

export function isNegativeOpeningAmount(raw: string): boolean {
  const trimmed = normalizeAmountInput(raw);
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n < 0;
}

function normalizeAmountInput(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(",", ".");
}

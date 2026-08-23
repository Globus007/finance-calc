/**
 * Thin NBRB HTTP client (ADR-0013 seam). Untested by design — no network tests.
 * Rate id 431 is USD; `parammode=1` queries by numeric id.
 */
const NBRB_USD_URL = "https://api.nbrb.by/exrates/rates/431?parammode=1";

/** Resolves the official USD→BYN rate, or null on any transport/shape failure. */
export async function fetchNbrbUsdRate(): Promise<number | null> {
  try {
    const res = await fetch(NBRB_USD_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { Cur_OfficialRate?: unknown };
    const rate = Number(data.Cur_OfficialRate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

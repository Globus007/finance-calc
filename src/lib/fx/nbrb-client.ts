/**
 * Thin NBRB HTTP client (ADR-0013 seam, per-Currency since ADR-0014).
 * Untested by design — no network tests.
 *
 * Query by Cur_ID with no `parammode` (NBRB 404s when `parammode=1` is
 * appended to a Cur_ID). USD = 431, EUR = 451; both scales are 1 unit,
 * so `Cur_OfficialRate` is directly X→BYN.
 */
const NBRB_CUR_ID: Record<"USD" | "EUR", number> = {
  USD: 431,
  EUR: 451,
};

/** Resolves the official USD→BYN / EUR→BYN rate, or null on any failure. */
export async function fetchNbrbRate(
  currency: "USD" | "EUR",
): Promise<number | null> {
  const id = NBRB_CUR_ID[currency];
  if (!id) return null;

  try {
    const res = await fetch(`https://api.nbrb.by/exrates/rates/${id}`, {
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

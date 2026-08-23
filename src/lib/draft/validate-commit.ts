import { parseAmount } from "./parse-amount";
import { isNoteTooLong, normalizeNote } from "./normalize-note";
import type { Draft, DraftCurrency } from "./types";

export type CommitRejection =
  | "amount_required"
  | "amount_too_large"
  | "currency_rate_unavailable"
  | "date_required"
  | "category_required"
  | "note_too_long"
  | "invalid_channel_for_kind";

export type CommitValidation =
  | {
      ok: true;
      /** Canonical BYN amount for storage and all aggregates. */
      amount: number;
      /** Amount exactly as typed (USD drafts keep the typed figure). */
      originalAmount: number;
      currency: DraftCurrency;
      /** Rate used for USD→BYN; null for native-BYN rows. */
      fxRate: number | null;
      occurredOn: string;
      categoryId: string | null;
      note: string | null;
    }
  | { ok: false; reason: CommitRejection };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Postgres numeric(12, 2): ten integer digits + two fractional. */
export const MAX_COMMIT_AMOUNT = 9_999_999_999.99;

/**
 * True only for a real calendar day in YYYY-MM-DD (rejects 2026-02-30, 13th month, etc.).
 * Uses UTC components so the check is independent of the host timezone.
 */
export function isValidCalendarDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** Half-up rounding to 2 dp via string exponent (same rule as parseAmount). */
export function roundHalfUp2(value: number): number {
  return Math.round(Number(`${value}e2`)) / 100;
}

/** Injected effective rate — resolved server-side, never fetched here (ADR-0013). */
export type CommitFx = { rate: number };

/**
 * Commit minimum validity (ADR-0003 + ADR-0013):
 * - Expense: Amount > 0 + Occurred on + Category
 * - Income: Amount > 0 + Occurred on
 * Channel is not user-edited; photo forbidden for Income.
 * Limits apply to the canonical amount; a USD draft converts to canonical BYN
 * half-up at the injected rate, fixed once at Commit/Edit-save.
 */
export function validateCommit(
  draft: Draft,
  fx?: CommitFx | null,
): CommitValidation {
  if (draft.kind === "income" && draft.channel === "photo") {
    return { ok: false, reason: "invalid_channel_for_kind" };
  }

  if (isNoteTooLong(draft.note)) {
    return { ok: false, reason: "note_too_long" };
  }

  const amount = parseAmount(draft.amount);
  if (amount === null) {
    return { ok: false, reason: "amount_required" };
  }
  if (amount > MAX_COMMIT_AMOUNT) {
    return { ok: false, reason: "amount_too_large" };
  }

  const currency: DraftCurrency = draft.currency ?? "BYN";
  let canonical = amount;
  let fxRate: number | null = null;
  if (currency === "USD") {
    const rate = fx?.rate;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      return { ok: false, reason: "currency_rate_unavailable" };
    }
    canonical = roundHalfUp2(amount * rate);
    if (canonical > MAX_COMMIT_AMOUNT) {
      return { ok: false, reason: "amount_too_large" };
    }
    fxRate = rate;
  }

  const occurredOn = draft.occurredOn.trim();
  if (!occurredOn || !isValidCalendarDate(occurredOn)) {
    return { ok: false, reason: "date_required" };
  }

  if (draft.kind === "expense") {
    const categoryId = draft.categoryId.trim();
    if (!categoryId) {
      return { ok: false, reason: "category_required" };
    }
    return {
      ok: true,
      amount: canonical,
      originalAmount: amount,
      currency,
      fxRate,
      occurredOn,
      categoryId,
      note: normalizeNote(draft.note),
    };
  }

  return {
    ok: true,
    amount: canonical,
    originalAmount: amount,
    currency,
    fxRate,
    occurredOn,
    categoryId: null,
    note: normalizeNote(draft.note),
  };
}

/**
 * Whether the confirm Commit control may be enabled. The rate is resolved
 * server-side at Commit time, so a missing rate must not disable the button;
 * the server rejects with an actionable message when USD has no rate.
 */
export function canCommit(draft: Draft): boolean {
  const validation = validateCommit(draft);
  return validation.ok || validation.reason === "currency_rate_unavailable";
}

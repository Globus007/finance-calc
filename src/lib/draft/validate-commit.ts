import { parseAmount } from "./parse-amount";
import { isNoteTooLong, normalizeNote } from "./normalize-note";
import type { Draft } from "./types";

export type CommitRejection =
  | "amount_required"
  | "amount_too_large"
  | "date_required"
  | "category_required"
  | "note_too_long"
  | "invalid_channel_for_kind";

export type CommitValidation =
  | {
      ok: true;
      amount: number;
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

/**
 * Commit minimum validity (ADR-0003):
 * - Expense: Amount > 0 + Occurred on + Category
 * - Income: Amount > 0 + Occurred on
 * Channel is not user-edited; photo forbidden for Income.
 * Amount must fit numeric(12,2); Occurred on must be a real calendar day.
 */
export function validateCommit(draft: Draft): CommitValidation {
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
      amount,
      occurredOn,
      categoryId,
      note: normalizeNote(draft.note),
    };
  }

  return {
    ok: true,
    amount,
    occurredOn,
    categoryId: null,
    note: normalizeNote(draft.note),
  };
}

/** Whether the confirm Commit control may be enabled. */
export function canCommit(draft: Draft): boolean {
  return validateCommit(draft).ok;
}

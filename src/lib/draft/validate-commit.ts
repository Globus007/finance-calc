import { parseAmount } from "./parse-amount";
import { isNoteTooLong, normalizeNote } from "./normalize-note";
import type { Draft } from "./types";

export type CommitRejection =
  | "amount_required"
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

/**
 * Commit minimum validity (ADR-0003):
 * - Expense: Amount > 0 + Occurred on + Category
 * - Income: Amount > 0 + Occurred on
 * Channel is not user-edited; photo forbidden for Income.
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

  const occurredOn = draft.occurredOn.trim();
  if (!occurredOn || !DATE_RE.test(occurredOn)) {
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

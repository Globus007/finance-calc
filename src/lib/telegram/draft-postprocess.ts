/**
 * Bot-only Draft post-process after extract (ADR-0010 / ADR-0011).
 * - Force Expense (voice may have proposed Income)
 * - Photo caption → Note only when extract left Note empty
 */

import { MAX_NOTE_LENGTH } from "@/lib/draft/normalize-note";
import type { Draft } from "@/lib/draft/types";

/** Force Expense Draft; Income-like voice keeps edits on Expense with Category fallback. */
export function forceExpenseDraft(
  draft: Draft,
  systemFallbackCategoryId: string,
): Draft {
  if (draft.kind === "expense") {
    return {
      ...draft,
      categoryId: draft.categoryId || systemFallbackCategoryId,
    };
  }
  return {
    kind: "expense",
    channel: draft.channel,
    amount: draft.amount,
    occurredOn: draft.occurredOn,
    categoryId: systemFallbackCategoryId,
    note: draft.note,
  };
}

/**
 * Prefill Note from photo caption only when extract Note is empty.
 * Does not overwrite a good extract merchant/Note (ADR-0011).
 */
export function applyCaptionNoteIfEmpty(
  draft: Draft,
  caption: string | null | undefined,
): Draft {
  if (draft.note.trim()) return draft;
  const cap = (caption ?? "").trim();
  if (!cap) return draft;
  const note = cap.length > MAX_NOTE_LENGTH ? cap.slice(0, MAX_NOTE_LENGTH) : cap;
  return { ...draft, note };
}

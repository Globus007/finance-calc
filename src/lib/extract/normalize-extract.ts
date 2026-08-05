import { todayInMinsk } from "@/lib/dates/minsk-today";
import { isValidCalendarDate } from "@/lib/draft/validate-commit";
import { MAX_NOTE_LENGTH, normalizeNote } from "@/lib/draft/normalize-note";
import type { CaptureChannel, Draft, RecordKind } from "@/lib/draft/types";
import type { ExtractModelOutput } from "./schema";

export type VisibleCategoryRef = {
  id: string;
  displayName: string;
};

export type NormalizeExtractInput = {
  raw: ExtractModelOutput;
  /** Capture channel that produced this extract. */
  channel: CaptureChannel;
  /**
   * When true (photo), record_kind is forced to expense regardless of model.
   * Voice leaves model kind (with fallback to expense).
   */
  forceExpense: boolean;
  /** Visible Categories injected in the prompt (stable ids). */
  visibleCategories: VisibleCategoryRef[];
  /** System fallback «Прочее» id — required for Expense Category default. */
  systemFallbackCategoryId: string;
  /** Clock for Minsk “today” (tests inject a fixed Date). */
  at?: Date;
};

export type NormalizedExtract = {
  kind: RecordKind;
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
};

/**
 * Coerce model JSON into Draft prefill fields (ADR-0007).
 * Incomplete fields (e.g. null Amount) still yield a usable Draft for confirm.
 */
export function normalizeExtract(
  input: NormalizeExtractInput,
): NormalizedExtract {
  const { raw, forceExpense, visibleCategories, systemFallbackCategoryId } =
    input;
  const at = input.at ?? new Date();

  const kind: RecordKind = forceExpense
    ? "expense"
    : raw.record_kind === "income"
      ? "income"
      : "expense";

  const amount = normalizeAmount(raw.amount);
  const occurredOn = normalizeOccurredOn(raw.occurred_on, at);
  const note = normalizeExtractNote(raw.note);

  if (kind === "income") {
    return {
      kind,
      amount,
      occurredOn,
      categoryId: "",
      note,
    };
  }

  const visibleIds = new Set(visibleCategories.map((c) => c.id));
  const categoryId =
    raw.category_id && visibleIds.has(raw.category_id)
      ? raw.category_id
      : systemFallbackCategoryId;

  return {
    kind: "expense",
    amount,
    occurredOn,
    categoryId,
    note,
  };
}

/**
 * Build an in-flight Draft from normalized extract fields.
 */
export function draftFromNormalized(
  normalized: NormalizedExtract,
  channel: CaptureChannel,
): Draft {
  return {
    kind: normalized.kind,
    channel,
    amount: normalized.amount,
    occurredOn: normalized.occurredOn,
    categoryId: normalized.categoryId,
    note: normalized.note,
  };
}

/** Absolute value, 2 dp; missing or ≤0 → empty string (null Amount on confirm). */
export function normalizeAmount(raw: number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== "number" || !Number.isFinite(raw)) return "";
  const abs = Math.abs(raw);
  // String exponent avoids binary float traps.
  const rounded = Math.round(Number(`${abs}e2`)) / 100;
  if (!Number.isFinite(rounded) || rounded <= 0) return "";
  return rounded.toFixed(2);
}

function normalizeOccurredOn(
  raw: string | null | undefined,
  at: Date,
): string {
  if (raw === null || raw === undefined) return todayInMinsk(at);
  const trimmed = raw.trim();
  if (!isValidCalendarDate(trimmed)) return todayInMinsk(at);
  return trimmed;
}

function normalizeExtractNote(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const note = normalizeNote(String(raw));
  if (note === null) return "";
  // Truncate over-long model notes rather than failing the whole extract.
  return note.length > MAX_NOTE_LENGTH ? note.slice(0, MAX_NOTE_LENGTH) : note;
}

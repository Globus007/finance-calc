/** In-flight Draft for confirm (client-only; ADR-0003). */

export type RecordKind = "expense" | "income";

export type CaptureChannel = "photo" | "voice" | "manual";

/**
 * Prospective single Expense or Income held on confirm.
 * Channel is system-set and not a form field.
 */
export type Draft = {
  kind: RecordKind;
  /** Channel set at capture; stored on Commit; not edited on confirm. */
  channel: CaptureChannel;
  /** Empty string until user/extract fills; Commit needs Amount > 0. */
  amount: string;
  /** YYYY-MM-DD; default today Europe/Minsk when opened empty. */
  occurredOn: string;
  /** Expense only; empty until user picks (manual) or extract maps. */
  categoryId: string;
  note: string;
};

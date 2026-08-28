import type { Currency } from "@/lib/fx";

/** In-flight Draft for confirm (client-only; ADR-0003). */

export type RecordKind = "expense" | "income";

export type CaptureChannel = "photo" | "voice" | "manual";

/**
 * Currency the Amount is typed in. It always comes from the Draft's Account
 * (ADR-0014) — there is no per-record currency choice.
 */
export type DraftCurrency = Currency;

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
  /**
   * Account the record will belong to. Manual capture picks it on confirm;
   * photo / voice / bot leave it absent and the server commits to the default
   * Account (ADR-0014).
   */
  accountId?: string;
  /** Typed currency of `amount`; mirrors `accountId`'s Currency (absent = BYN). */
  currency?: DraftCurrency;
};

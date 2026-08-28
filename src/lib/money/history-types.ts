import type { Currency, RateCurrency } from "@/lib/fx";

/** Kinds shown in History. Transfers never enter Monthly totals (ADR-0014). */
export type HistoryKind = "expense" | "income" | "transfer";

export type HistoryChannel = "photo" | "voice" | "manual";

/** Snapshot kept on committed records entered in USD / EUR (ADR-0013/#85). */
export type AmountSnapshot = {
  currency: RateCurrency;
  /** Amount as originally typed, in its Currency. */
  originalAmount: number;
  /** X→BYN rate fixed at Commit / Edit-save. */
  fxRate: number;
};

/** One committed Expense or Income in the mixed History list. */
export type HistoryItem = {
  id: string;
  kind: "expense" | "income";
  /** Canonical BYN amount (> 0); drives cross-Account aggregates. */
  amount: number;
  /** Present when the record was typed in USD/EUR (legacy BYN till rows too). */
  snapshot: AmountSnapshot | null;
  /** Owning Account; null only for pre-migration rows without a till. */
  accountId: string | null;
  /** Occurred on as YYYY-MM-DD. */
  occurredOn: string;
  /** Commit time (ISO); tie-break for sort only. */
  createdAt: string;
  /** Expense Category stable id; null for Income. */
  categoryId: string | null;
  /** Expense Category display name; null for Income. */
  categoryDisplayName: string | null;
  note: string | null;
  channel: HistoryChannel;
};

/** One committed Transfer in the mixed History list (third kind). */
export type TransferItem = {
  id: string;
  kind: "transfer";
  /** Canonical sort key (= movedOn). */
  occurredOn: string;
  createdAt: string;
  note: string | null;
  /** Amount as typed, in the source Account's Currency. */
  amount: number;
  /** Figure the target Account received, in the target Account's Currency. */
  convertedAmount: number;
  /** Implied source→target rate fixed at the moment of the move. */
  fxRate: number;
  sourceAccountId: string;
  targetAccountId: string;
};

/** Anything that appears in History. */
export type HistoryEntry = HistoryItem | TransferItem;

/** Live totals for one calendar month (native or BYN aggregate). */
export type MonthlyTotal = {
  expenseTotal: number;
  incomeTotal: number;
  /** incomeTotal − expenseTotal (derived). */
  net: number;
};

export const EMPTY_TOTALS: MonthlyTotal = {
  expenseTotal: 0,
  incomeTotal: 0,
  net: 0,
};

/**
 * Amount of an Expense/Income in the Currency it should be displayed and
 * summed in for one Account: native for a USD/EUR till, canonical BYN for a
 * BYN till (legacy rows typed in $ inside the old single till stay BYN here).
 */
export function nativeAmount(
  item: HistoryItem,
  accountCurrency: Currency,
): number {
  if (accountCurrency !== "BYN" && item.snapshot) {
    return item.snapshot.originalAmount;
  }
  return item.amount;
}

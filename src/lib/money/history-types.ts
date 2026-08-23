/** Committed History row for read surfaces (Home, History, Month). */

export type HistoryKind = "expense" | "income";

export type HistoryChannel = "photo" | "voice" | "manual";

/**
 * One committed Expense or Income in the mixed History list.
 * Drafts never appear here.
 */
export type HistoryItem = {
  id: string;
  kind: HistoryKind;
  /** BYN amount (> 0); canonical, drives all aggregates. */
  amount: number;
  /** Present only when entered in USD: original typed amount + rate (ADR-0013). */
  usd?: UsdSnapshot | null;
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

/** Live Monthly total for one calendar month (ADR-0004). */
export type MonthlyTotal = {
  expenseTotal: number;
  incomeTotal: number;
  /** incomeTotal − expenseTotal (derived). */
  net: number;
};

/** Snapshot kept on committed records entered in USD (ADR-0013). */
export type UsdSnapshot = {
  /** Amount as originally typed, in USD. */
  originalAmount: number;
  /** USD→BYN rate fixed at Commit / Edit-save. */
  fxRate: number;
};

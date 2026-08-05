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
  /** BYN amount (> 0). */
  amount: number;
  /** Occurred on as YYYY-MM-DD. */
  occurredOn: string;
  /** Commit time (ISO); tie-break for sort only. */
  createdAt: string;
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

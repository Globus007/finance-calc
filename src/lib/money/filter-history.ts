import type { HistoryEntry, HistoryKind } from "./history-types";

/** Kind segment for History filters: all committed records or one kind. */
export type HistoryFilterKind = "all" | HistoryKind;

/**
 * Query-only filters over committed History (no new domain entities).
 * Defaults = full list as today.
 */
export type HistoryFilters = {
  kind: HistoryFilterKind;
  /** Stable Category id; null = any. Applies to Expenses only. */
  categoryId: string | null;
  /** Account id; null = any. A Transfer matches when it touches the Account. */
  accountId: string | null;
  /** Inclusive Occurred on lower bound (YYYY-MM-DD); null = open. */
  from: string | null;
  /** Inclusive Occurred on upper bound (YYYY-MM-DD); null = open. */
  to: string | null;
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  kind: "all",
  categoryId: null,
  accountId: null,
  from: null,
  to: null,
};

/** True when an entry belongs to (or moves money through) this Account. */
export function entryTouchesAccount(
  entry: HistoryEntry,
  accountId: string,
): boolean {
  if (entry.kind === "transfer") {
    return entry.sourceAccountId === accountId || entry.targetAccountId === accountId;
  }
  return entry.accountId === accountId;
}

/**
 * Filter mixed committed History in memory (load-all pattern).
 * Category filter excludes Incomes and Transfers (neither has a Category).
 * When kind is not Expense/all, categoryId is ignored.
 */
export function filterHistory(
  entries: readonly HistoryEntry[],
  filters: HistoryFilters,
): HistoryEntry[] {
  const categoryActive =
    filters.categoryId != null &&
    (filters.kind === "all" || filters.kind === "expense");

  return entries.filter((entry) => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) {
      return false;
    }

    if (filters.accountId != null && !entryTouchesAccount(entry, filters.accountId)) {
      return false;
    }

    if (categoryActive) {
      if (entry.kind !== "expense") return false;
      if (entry.categoryId !== filters.categoryId) return false;
    }

    if (filters.from != null && entry.occurredOn < filters.from) {
      return false;
    }
    if (filters.to != null && entry.occurredOn > filters.to) {
      return false;
    }

    return true;
  });
}

/** True when any filter narrows the list vs the default full History. */
export function hasActiveHistoryFilters(filters: HistoryFilters): boolean {
  return (
    filters.kind !== DEFAULT_HISTORY_FILTERS.kind ||
    filters.categoryId != null ||
    filters.accountId != null ||
    filters.from != null ||
    filters.to != null
  );
}

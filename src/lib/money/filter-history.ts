import type { HistoryItem, HistoryKind } from "./history-types";

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
  /** Inclusive Occurred on lower bound (YYYY-MM-DD); null = open. */
  from: string | null;
  /** Inclusive Occurred on upper bound (YYYY-MM-DD); null = open. */
  to: string | null;
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  kind: "all",
  categoryId: null,
  from: null,
  to: null,
};

/**
 * Filter mixed committed History in memory (load-all pattern).
 * Category filter excludes Incomes (Income has no Category).
 * When kind is Income, categoryId is ignored.
 */
export function filterHistory(
  items: readonly HistoryItem[],
  filters: HistoryFilters,
): HistoryItem[] {
  const categoryActive =
    filters.categoryId != null && filters.kind !== "income";

  return items.filter((item) => {
    if (filters.kind !== "all" && item.kind !== filters.kind) {
      return false;
    }

    if (categoryActive) {
      if (item.kind !== "expense") return false;
      if (item.categoryId !== filters.categoryId) return false;
    }

    if (filters.from != null && item.occurredOn < filters.from) {
      return false;
    }
    if (filters.to != null && item.occurredOn > filters.to) {
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
    filters.from != null ||
    filters.to != null
  );
}

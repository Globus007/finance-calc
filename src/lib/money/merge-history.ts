import type { HistoryEntry } from "./history-types";

/**
 * Mixed History: committed Expenses, Incomes, and Transfers ordered by
 * Occurred on DESC, then createdAt DESC as tie-break (ADR-0006 / ADR-0014).
 */
export function mergeHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort(compareHistory);
}

export function compareHistory(a: HistoryEntry, b: HistoryEntry): number {
  // Occurred on DESC (YYYY-MM-DD lexicographic = chronological).
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? 1 : -1;
  }
  // createdAt DESC
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  // Stable-ish fallback by id
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

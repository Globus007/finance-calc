import type { HistoryItem } from "./history-types";

/**
 * Fallback when a committed Expense has no Category display name on the row
 * (defensive join miss). Matches HistoryList title fallback — not a Category.
 */
export const MISSING_CATEGORY_LABEL = "Расход";

/**
 * One Category row in a month's expense-side breakdown (derived view).
 * Share is of that month's expense total (0–1), not of net.
 */
export type CategoryBreakdownRow = {
  categoryDisplayName: string;
  /** Sum of Expense Amounts for this Category in the month (BYN, 2 dp). */
  amount: number;
  /** amount / expenseTotal for the month (0–1); 0 when expense total is 0. */
  shareOfExpenseTotal: number;
};

/**
 * Aggregate committed Expenses by Category for a month's History items.
 * Income is ignored (no Category). Zero-spend Categories are omitted.
 * Rows sorted by amount desc, then display name (ru) for ties.
 */
export function computeCategoryBreakdown(
  items: readonly HistoryItem[],
): CategoryBreakdownRow[] {
  const totals = new Map<string, number>();
  let expenseTotal = 0;

  for (const item of items) {
    if (item.kind !== "expense") continue;
    const name =
      item.categoryDisplayName?.trim() || MISSING_CATEGORY_LABEL;
    expenseTotal += item.amount;
    totals.set(name, (totals.get(name) ?? 0) + item.amount);
  }

  expenseTotal = round2(expenseTotal);
  if (expenseTotal === 0) return [];

  const rows: CategoryBreakdownRow[] = [];
  for (const [categoryDisplayName, raw] of totals) {
    const amount = round2(raw);
    if (amount === 0) continue;
    rows.push({
      categoryDisplayName,
      amount,
      shareOfExpenseTotal: round4(amount / expenseTotal),
    });
  }

  return rows.toSorted((a, b) => {
    if (a.amount !== b.amount) return b.amount - a.amount;
    return a.categoryDisplayName.localeCompare(b.categoryDisplayName, "ru");
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

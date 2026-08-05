import type { HistoryItem, MonthlyTotal } from "./history-types";

/**
 * Live Monthly total over committed History items already filtered to one month.
 * Empty list → zeros. Net = income − expense.
 */
export function computeMonthlyTotal(items: HistoryItem[]): MonthlyTotal {
  let expenseTotal = 0;
  let incomeTotal = 0;
  for (const item of items) {
    if (item.kind === "expense") {
      expenseTotal += item.amount;
    } else {
      incomeTotal += item.amount;
    }
  }
  // Round to 2 dp to avoid float drift from repeated sums of money.
  expenseTotal = round2(expenseTotal);
  incomeTotal = round2(incomeTotal);
  return {
    expenseTotal,
    incomeTotal,
    net: round2(incomeTotal - expenseTotal),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

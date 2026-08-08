import { describe, expect, it } from "vitest";
import { computeMonthlyTotal } from "./monthly-total";
import type { HistoryItem } from "./history-types";

function expense(
  amount: number,
  occurredOn: string,
  id = "e1",
): HistoryItem {
  return {
    id,
    kind: "expense",
    amount,
    occurredOn,
    createdAt: "2026-08-01T10:00:00.000Z",
    categoryId: "cat-food",
    categoryDisplayName: "Продукты",
    note: null,
    channel: "manual",
  };
}

function income(
  amount: number,
  occurredOn: string,
  id = "i1",
): HistoryItem {
  return {
    id,
    kind: "income",
    amount,
    occurredOn,
    createdAt: "2026-08-01T10:00:00.000Z",
    categoryId: null,
    categoryDisplayName: null,
    note: "Зарплата",
    channel: "manual",
  };
}

describe("computeMonthlyTotal", () => {
  it("returns zeros for an empty list", () => {
    expect(computeMonthlyTotal([])).toEqual({
      expenseTotal: 0,
      incomeTotal: 0,
      net: 0,
    });
  });

  it("sums expense and income totals and derives net as income − expense", () => {
    const items = [
      expense(48.2, "2026-08-04", "e1"),
      income(2100, "2026-08-01", "i1"),
      expense(12.5, "2026-08-03", "e2"),
    ];
    expect(computeMonthlyTotal(items)).toEqual({
      expenseTotal: 60.7,
      incomeTotal: 2100,
      net: 2039.3,
    });
  });

  it("handles expense-only months (negative net)", () => {
    expect(computeMonthlyTotal([expense(100, "2026-08-01")])).toEqual({
      expenseTotal: 100,
      incomeTotal: 0,
      net: -100,
    });
  });

  it("handles income-only months", () => {
    expect(computeMonthlyTotal([income(50, "2026-08-01")])).toEqual({
      expenseTotal: 0,
      incomeTotal: 50,
      net: 50,
    });
  });
});

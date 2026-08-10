import { describe, expect, it } from "vitest";
import { computeCategoryBreakdown } from "./category-breakdown";
import type { HistoryItem } from "./history-types";

function expense(
  amount: number,
  categoryDisplayName: string | null,
  id = "e1",
): HistoryItem {
  return {
    id,
    kind: "expense",
    amount,
    occurredOn: "2026-08-04",
    createdAt: "2026-08-04T10:00:00.000Z",
    categoryDisplayName,
    note: null,
    channel: "manual",
  };
}

function income(amount: number, id = "i1"): HistoryItem {
  return {
    id,
    kind: "income",
    amount,
    occurredOn: "2026-08-01",
    createdAt: "2026-08-01T10:00:00.000Z",
    categoryDisplayName: null,
    note: "Зарплата",
    channel: "manual",
  };
}

describe("computeCategoryBreakdown", () => {
  it("returns empty list when there are no expenses", () => {
    expect(computeCategoryBreakdown([])).toEqual([]);
    expect(computeCategoryBreakdown([income(2100)])).toEqual([]);
  });

  it("aggregates expense amounts by Category and omits income", () => {
    const items = [
      expense(48.2, "Продукты", "e1"),
      income(2100, "i1"),
      expense(12.5, "Кафе", "e2"),
      expense(10, "Продукты", "e3"),
    ];
    const rows = computeCategoryBreakdown(items);
    // 58.2/70.7 ≈ 0.8232, 12.5/70.7 ≈ 0.1768 (4 dp)
    expect(rows).toEqual([
      {
        categoryDisplayName: "Продукты",
        amount: 58.2,
        shareOfExpenseTotal: 0.8232,
      },
      {
        categoryDisplayName: "Кафе",
        amount: 12.5,
        shareOfExpenseTotal: 0.1768,
      },
    ]);
    const sum = rows.reduce((acc, r) => acc + r.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(70.7);
  });

  it("sorts by amount descending, then display name for ties", () => {
    const items = [
      expense(20, "Транспорт", "e1"),
      expense(50, "Продукты", "e2"),
      expense(20, "Кафе", "e3"),
    ];
    expect(
      computeCategoryBreakdown(items).map((r) => r.categoryDisplayName),
    ).toEqual(["Продукты", "Кафе", "Транспорт"]);
  });

  it("groups missing Category display name under History-style fallback", () => {
    const rows = computeCategoryBreakdown([
      expense(15, null, "e1"),
      expense(5, "Прочее", "e2"),
    ]);
    expect(rows).toEqual([
      {
        categoryDisplayName: "Расход",
        amount: 15,
        shareOfExpenseTotal: 0.75,
      },
      {
        categoryDisplayName: "Прочее",
        amount: 5,
        shareOfExpenseTotal: 0.25,
      },
    ]);
  });

  it("gives share 1 when a single category has all expenses", () => {
    expect(computeCategoryBreakdown([expense(100, "Продукты")])).toEqual([
      {
        categoryDisplayName: "Продукты",
        amount: 100,
        shareOfExpenseTotal: 1,
      },
    ]);
  });
});

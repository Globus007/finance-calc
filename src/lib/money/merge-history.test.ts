import { describe, expect, it } from "vitest";
import type { HistoryItem } from "./history-types";
import { mergeHistory } from "./merge-history";

function item(
  partial: Pick<HistoryItem, "id" | "kind" | "occurredOn" | "createdAt"> &
    Partial<HistoryItem>,
): HistoryItem {
  return {
    amount: 10,
    categoryId: partial.kind === "expense" ? "cat-other" : null,
    categoryDisplayName: partial.kind === "expense" ? "Прочее" : null,
    note: null,
    channel: "manual",
    ...partial,
  };
}

describe("mergeHistory", () => {
  it("returns empty list when both sides are empty", () => {
    expect(mergeHistory([], [])).toEqual([]);
  });

  it("mixes Expenses and Incomes ordered by Occurred on descending", () => {
    const expenses = [
      item({
        id: "e-early",
        kind: "expense",
        occurredOn: "2026-08-01",
        createdAt: "2026-08-01T12:00:00.000Z",
      }),
      item({
        id: "e-late",
        kind: "expense",
        occurredOn: "2026-08-04",
        createdAt: "2026-08-04T12:00:00.000Z",
      }),
    ];
    const incomes = [
      item({
        id: "i-mid",
        kind: "income",
        occurredOn: "2026-08-02",
        createdAt: "2026-08-02T12:00:00.000Z",
        amount: 100,
        note: "Зарплата",
      }),
    ];

    const merged = mergeHistory(expenses, incomes);
    expect(merged.map((r) => r.id)).toEqual(["e-late", "i-mid", "e-early"]);
  });

  it("breaks Occurred on ties with createdAt descending", () => {
    const expenses = [
      item({
        id: "e-old",
        kind: "expense",
        occurredOn: "2026-08-04",
        createdAt: "2026-08-04T08:00:00.000Z",
      }),
    ];
    const incomes = [
      item({
        id: "i-new",
        kind: "income",
        occurredOn: "2026-08-04",
        createdAt: "2026-08-04T18:00:00.000Z",
      }),
    ];

    expect(mergeHistory(expenses, incomes).map((r) => r.id)).toEqual([
      "i-new",
      "e-old",
    ]);
  });
});

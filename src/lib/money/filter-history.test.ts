import { describe, expect, it } from "vitest";
import {
  DEFAULT_HISTORY_FILTERS,
  filterHistory,
  hasActiveHistoryFilters,
  type HistoryFilters,
} from "./filter-history";
import type { HistoryItem } from "./history-types";

function expense(
  partial: Partial<HistoryItem> & Pick<HistoryItem, "id">,
): HistoryItem {
  return {
    kind: "expense",
    amount: 10,
    occurredOn: "2026-08-04",
    createdAt: "2026-08-04T12:00:00.000Z",
    categoryId: "cat-food",
    categoryDisplayName: "Продукты",
    note: null,
    channel: "manual",
    ...partial,
  };
}

function income(
  partial: Partial<HistoryItem> & Pick<HistoryItem, "id">,
): HistoryItem {
  return {
    kind: "income",
    amount: 100,
    occurredOn: "2026-08-04",
    createdAt: "2026-08-04T12:00:00.000Z",
    categoryId: null,
    categoryDisplayName: null,
    note: "Зарплата",
    channel: "manual",
    ...partial,
  };
}

const catalog = [
  expense({ id: "e-food", categoryId: "cat-food", categoryDisplayName: "Продукты", occurredOn: "2026-08-02" }),
  expense({
    id: "e-transport",
    categoryId: "cat-transport",
    categoryDisplayName: "Транспорт",
    occurredOn: "2026-08-05",
  }),
  income({ id: "i-salary", occurredOn: "2026-08-03", note: "Зарплата" }),
  income({ id: "i-gift", occurredOn: "2026-07-15", note: "Подарок" }),
];

function ids(items: HistoryItem[]): string[] {
  return items.map((i) => i.id);
}

function filters(partial: Partial<HistoryFilters> = {}): HistoryFilters {
  return { ...DEFAULT_HISTORY_FILTERS, ...partial };
}

describe("filterHistory", () => {
  it("returns the full list when filters are default (all / no category / open dates)", () => {
    expect(ids(filterHistory(catalog, filters()))).toEqual(ids(catalog));
  });

  it("keeps only Expenses when kind is expense", () => {
    expect(ids(filterHistory(catalog, filters({ kind: "expense" })))).toEqual([
      "e-food",
      "e-transport",
    ]);
  });

  it("keeps only Incomes when kind is income", () => {
    expect(ids(filterHistory(catalog, filters({ kind: "income" })))).toEqual([
      "i-salary",
      "i-gift",
    ]);
  });

  it("when a Category is selected, keeps matching Expenses and excludes Incomes", () => {
    expect(
      ids(filterHistory(catalog, filters({ categoryId: "cat-food" }))),
    ).toEqual(["e-food"]);
  });

  it("ignores category filter when kind is income (Income has no Category)", () => {
    expect(
      ids(
        filterHistory(
          catalog,
          filters({ kind: "income", categoryId: "cat-food" }),
        ),
      ),
    ).toEqual(["i-salary", "i-gift"]);
  });

  it("filters by Occurred on from (inclusive)", () => {
    expect(
      ids(filterHistory(catalog, filters({ from: "2026-08-03" }))),
    ).toEqual(["e-transport", "i-salary"]);
  });

  it("filters by Occurred on to (inclusive)", () => {
    expect(ids(filterHistory(catalog, filters({ to: "2026-08-03" })))).toEqual([
      "e-food",
      "i-salary",
      "i-gift",
    ]);
  });

  it("filters by inclusive date range on Occurred on", () => {
    expect(
      ids(
        filterHistory(
          catalog,
          filters({ from: "2026-08-02", to: "2026-08-03" }),
        ),
      ),
    ).toEqual(["e-food", "i-salary"]);
  });

  it("combines kind, category, and date range", () => {
    const mixed: HistoryItem[] = [
      ...catalog,
      expense({
        id: "e-food-old",
        categoryId: "cat-food",
        categoryDisplayName: "Продукты",
        occurredOn: "2026-07-01",
      }),
    ];
    expect(
      ids(
        filterHistory(
          mixed,
          filters({
            kind: "expense",
            categoryId: "cat-food",
            from: "2026-08-01",
          }),
        ),
      ),
    ).toEqual(["e-food"]);
  });

  it("does not mutate the input list", () => {
    const input = [...catalog];
    filterHistory(input, filters({ kind: "expense" }));
    expect(ids(input)).toEqual(ids(catalog));
  });
});

describe("hasActiveHistoryFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveHistoryFilters(filters())).toBe(false);
  });

  it("is true when any filter differs from default", () => {
    expect(hasActiveHistoryFilters(filters({ kind: "expense" }))).toBe(true);
    expect(hasActiveHistoryFilters(filters({ categoryId: "cat-food" }))).toBe(
      true,
    );
    expect(hasActiveHistoryFilters(filters({ from: "2026-08-01" }))).toBe(true);
    expect(hasActiveHistoryFilters(filters({ to: "2026-08-31" }))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { mapExpenseRow, mapIncomeRow } from "./map-row";

describe("mapExpenseRow", () => {
  it("maps snake_case expense + category join to HistoryItem", () => {
    expect(
      mapExpenseRow({
        id: "e1",
        amount: "48.20",
        occurred_on: "2026-08-04",
        note: "Евроопт",
        channel: "photo",
        created_at: "2026-08-04T10:00:00.000Z",
        categories: { display_name: "Продукты" },
      }),
    ).toEqual({
      id: "e1",
      kind: "expense",
      amount: 48.2,
      occurredOn: "2026-08-04",
      createdAt: "2026-08-04T10:00:00.000Z",
      categoryDisplayName: "Продукты",
      note: "Евроопт",
      channel: "photo",
    });
  });
});

describe("mapIncomeRow", () => {
  it("maps income without Category", () => {
    expect(
      mapIncomeRow({
        id: "i1",
        amount: 2100,
        occurred_on: "2026-08-01",
        note: "Зарплата",
        channel: "manual",
        created_at: "2026-08-01T10:00:00.000Z",
      }),
    ).toEqual({
      id: "i1",
      kind: "income",
      amount: 2100,
      occurredOn: "2026-08-01",
      createdAt: "2026-08-01T10:00:00.000Z",
      categoryDisplayName: null,
      note: "Зарплата",
      channel: "manual",
    });
  });
});

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
        category_id: "cat-food",
        categories: { display_name: "Продукты" },
      }),
    ).toEqual({
      id: "e1",
      kind: "expense",
      amount: 48.2,
      occurredOn: "2026-08-04",
      createdAt: "2026-08-04T10:00:00.000Z",
      categoryId: "cat-food",
      categoryDisplayName: "Продукты",
      note: "Евроопт",
      channel: "photo",
      usd: null,
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
      categoryId: null,
      categoryDisplayName: null,
      note: "Зарплата",
      channel: "manual",
      usd: null,
    });
  });
});

describe("currency snapshot columns (ADR-0013)", () => {
  it("maps USD snapshot columns onto the History item", () => {
    expect(
      mapExpenseRow({
        id: "e2",
        amount: "165",
        occurred_on: "2026-08-04",
        note: null,
        channel: "manual",
        created_at: "2026-08-04T10:00:00.000Z",
        category_id: "cat-food",
        currency: "USD",
        original_amount: "50",
        fx_rate: "3.3012",
        categories: { display_name: "Продукты" },
      }).usd,
    ).toEqual({ originalAmount: 50, fxRate: 3.3012 });
  });

  it("old rows without the columns read as native BYN", () => {
    const row = mapExpenseRow({
      id: "e3",
      amount: 10,
      occurred_on: "2026-08-04",
      note: null,
      channel: "voice",
      created_at: "2026-08-04T10:00:00.000Z",
      category_id: "cat-food",
      categories: { display_name: "Продукты" },
    });
    expect(row.usd).toBeNull();

    const income = mapIncomeRow({
      id: "i2",
      amount: "20",
      occurred_on: "2026-08-01",
      note: null,
      channel: "manual",
      created_at: "2026-08-01T10:00:00.000Z",
      currency: "BYN",
      original_amount: null,
      fx_rate: null,
    });
    expect(income.usd).toBeNull();
  });
});

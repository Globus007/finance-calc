import { describe, expect, it } from "vitest";
import {
  draftFromNormalized,
  normalizeAmount,
  normalizeExtract,
} from "./normalize-extract";

const FALLBACK = "cat-prochee";
const PRODUCTS = "cat-products";
const HIDDEN = "cat-hidden";

const visible = [
  { id: PRODUCTS, displayName: "Продукты" },
  { id: FALLBACK, displayName: "Прочее" },
];

const fixedAt = new Date("2026-08-05T12:00:00.000Z");

describe("normalizeAmount", () => {
  it("returns absolute value rounded to 2 dp as string", () => {
    expect(normalizeAmount(12.5)).toBe("12.50");
    expect(normalizeAmount(-3.1)).toBe("3.10");
    expect(normalizeAmount(1.005)).toBe("1.01");
  });

  it("maps missing, non-finite, and ≤0 to empty (null Amount)", () => {
    expect(normalizeAmount(null)).toBe("");
    expect(normalizeAmount(undefined)).toBe("");
    expect(normalizeAmount(0)).toBe("");
    expect(normalizeAmount(-0)).toBe("");
    expect(normalizeAmount(Number.NaN)).toBe("");
  });
});

describe("normalizeExtract", () => {
  it("forces expense for photo even when model returns income", () => {
    const n = normalizeExtract({
      raw: {
        record_kind: "income",
        amount: 10,
        occurred_on: "2026-07-01",
        category_id: PRODUCTS,
        note: "x",
      },
      channel: "photo",
      forceExpense: true,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(n.kind).toBe("expense");
    expect(n.categoryId).toBe(PRODUCTS);
  });

  it("uses Minsk today when occurred_on is null or invalid", () => {
    const nNull = normalizeExtract({
      raw: {
        record_kind: "expense",
        amount: 1,
        occurred_on: null,
        category_id: null,
        note: null,
      },
      channel: "photo",
      forceExpense: true,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(nNull.occurredOn).toBe("2026-08-05");

    const nBad = normalizeExtract({
      raw: {
        record_kind: "expense",
        amount: 1,
        occurred_on: "not-a-date",
        category_id: null,
        note: null,
      },
      channel: "photo",
      forceExpense: true,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(nBad.occurredOn).toBe("2026-08-05");
  });

  it("keeps valid calendar dates including future", () => {
    const n = normalizeExtract({
      raw: {
        record_kind: "expense",
        amount: 5,
        occurred_on: "2027-01-15",
        category_id: PRODUCTS,
        note: null,
      },
      channel: "photo",
      forceExpense: true,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(n.occurredOn).toBe("2027-01-15");
  });

  it("maps unknown/hidden/null category to system fallback «Прочее»", () => {
    for (const category_id of [null, "unknown-id", HIDDEN, ""]) {
      const n = normalizeExtract({
        raw: {
          record_kind: "expense",
          amount: 2,
          occurred_on: "2026-08-01",
          category_id: category_id || null,
          note: null,
        },
        channel: "photo",
        forceExpense: true,
        visibleCategories: visible,
        systemFallbackCategoryId: FALLBACK,
        at: fixedAt,
      });
      expect(n.categoryId).toBe(FALLBACK);
    }
  });

  it("null Amount still produces a Draft-ready normalize (empty amount)", () => {
    const n = normalizeExtract({
      raw: {
        record_kind: "expense",
        amount: null,
        occurred_on: null,
        category_id: null,
        note: "Магазин",
      },
      channel: "photo",
      forceExpense: true,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(n.amount).toBe("");
    expect(n.categoryId).toBe(FALLBACK);
    expect(n.note).toBe("Магазин");
    expect(n.occurredOn).toBe("2026-08-05");
  });

  it("trims note; empty → empty string; income ignores category", () => {
    const n = normalizeExtract({
      raw: {
        record_kind: "income",
        amount: 100,
        occurred_on: "2026-08-02",
        category_id: PRODUCTS,
        note: "  ",
      },
      channel: "voice",
      forceExpense: false,
      visibleCategories: visible,
      systemFallbackCategoryId: FALLBACK,
      at: fixedAt,
    });
    expect(n.kind).toBe("income");
    expect(n.categoryId).toBe("");
    expect(n.note).toBe("");
  });
});

describe("draftFromNormalized", () => {
  it("sets channel photo and expense fields", () => {
    const draft = draftFromNormalized(
      {
        kind: "expense",
        amount: "12.50",
        occurredOn: "2026-08-05",
        categoryId: FALLBACK,
        note: "Cafe",
      },
      "photo",
    );
    expect(draft).toEqual({
      kind: "expense",
      channel: "photo",
      amount: "12.50",
      occurredOn: "2026-08-05",
      categoryId: FALLBACK,
      note: "Cafe",
    });
  });
});

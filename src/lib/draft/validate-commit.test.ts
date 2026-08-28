import { describe, expect, it } from "vitest";
import type { Draft } from "./types";
import { canCommit, validateCommit } from "./validate-commit";

function expense(partial: Partial<Draft> = {}): Draft {
  return {
    kind: "expense",
    channel: "manual",
    amount: "10.00",
    occurredOn: "2026-08-05",
    categoryId: "cat-1",
    note: "",
    ...partial,
  };
}

function income(partial: Partial<Draft> = {}): Draft {
  return {
    kind: "income",
    channel: "manual",
    amount: "100",
    occurredOn: "2026-08-05",
    categoryId: "",
    note: "зарплата",
    ...partial,
  };
}

describe("validateCommit", () => {
  it("accepts a complete manual Expense", () => {
    expect(validateCommit(expense())).toEqual({
      ok: true,
      amount: 10,
      originalAmount: 10,
      currency: "BYN",
      fxRate: null,
      occurredOn: "2026-08-05",
      categoryId: "cat-1",
      note: null,
      accountId: "",
    });
  });

  it("accepts a complete manual Income without Category", () => {
    expect(validateCommit(income())).toEqual({
      ok: true,
      amount: 100,
      originalAmount: 100,
      currency: "BYN",
      fxRate: null,
      occurredOn: "2026-08-05",
      categoryId: null,
      note: "зарплата",
      accountId: "",
    });
  });

  it("requires Amount > 0 for Expense and Income", () => {
    expect(validateCommit(expense({ amount: "" }))).toEqual({
      ok: false,
      reason: "amount_required",
    });
    expect(validateCommit(income({ amount: "0" }))).toEqual({
      ok: false,
      reason: "amount_required",
    });
  });

  it("requires Occurred on", () => {
    expect(validateCommit(expense({ occurredOn: "" }))).toEqual({
      ok: false,
      reason: "date_required",
    });
    expect(validateCommit(income({ occurredOn: "not-a-date" }))).toEqual({
      ok: false,
      reason: "date_required",
    });
  });

  it("rejects calendar-impossible Occurred on", () => {
    expect(validateCommit(expense({ occurredOn: "2026-02-30" }))).toEqual({
      ok: false,
      reason: "date_required",
    });
    expect(validateCommit(income({ occurredOn: "2025-02-29" }))).toEqual({
      ok: false,
      reason: "date_required",
    });
    expect(validateCommit(expense({ occurredOn: "2026-13-01" }))).toEqual({
      ok: false,
      reason: "date_required",
    });
    // Leap day is valid
    expect(validateCommit(expense({ occurredOn: "2024-02-29" })).ok).toBe(true);
  });

  it("rejects Amount above numeric(12,2) ceiling", () => {
    expect(validateCommit(expense({ amount: "10000000000" }))).toEqual({
      ok: false,
      reason: "amount_too_large",
    });
    expect(validateCommit(income({ amount: "9999999999.99" })).ok).toBe(true);
    // Rounds half-up past the ceiling
    expect(validateCommit(expense({ amount: "9999999999.995" }))).toEqual({
      ok: false,
      reason: "amount_too_large",
    });
  });

  it("requires Category only for Expense", () => {
    expect(validateCommit(expense({ categoryId: "" }))).toEqual({
      ok: false,
      reason: "category_required",
    });
    expect(validateCommit(income({ categoryId: "" })).ok).toBe(true);
  });

  it("rejects photo Channel for Income", () => {
    expect(validateCommit(income({ channel: "photo" }))).toEqual({
      ok: false,
      reason: "invalid_channel_for_kind",
    });
  });

  it("canCommit mirrors validation ok", () => {
    expect(canCommit(expense())).toBe(true);
    expect(canCommit(expense({ amount: "" }))).toBe(false);
  });
});

describe("validateCommit with currency (ADR-0013)", () => {
  it.each([
    ["10", 3.3012, 33.01],
    ["50", 3.3, 165],
    ["0.01", 3.3012, 0.03],
    // Half-up at the canonical 2 dp boundary (same rule as parseAmount).
    ["1.005", 1, 1.01],
  ])(
    "converts typed %j USD at rate %j to canonical BYN %j half-up",
    (typed, rate, canonical) => {
      const result = validateCommit(
        expense({ amount: typed, currency: "USD" }),
        { rate },
      );
      expect(result).toEqual({
        ok: true,
        amount: canonical,
        // Typed amount is parsed (and rounded) by the shared amount parser.
        originalAmount: Math.round(Number(`${typed}e2`)) / 100,
        currency: "USD",
        fxRate: rate,
        occurredOn: "2026-08-05",
        categoryId: "cat-1",
        note: null,
        accountId: "",
      });
    },
  );

  it("keeps the original amount and works for Income too", () => {
    const result = validateCommit(
      income({ amount: "50", currency: "USD" }),
      { rate: 3.35 },
    );
    expect(result).toMatchObject({
      ok: true,
      amount: 167.5,
      originalAmount: 50,
      currency: "USD",
      fxRate: 3.35,
    });
  });

  it("checks the column limit against the canonical amount after USD conversion", () => {
    // Typed amount itself is below the ceiling, but the converted BYN total exceeds it.
    expect(
      validateCommit(
        expense({ amount: "4000000000", currency: "USD" }),
        { rate: 3.3 },
      ),
    ).toEqual({
      ok: false,
      reason: "amount_too_large",
    });

    // Typed amount above the ceiling is still rejected before conversion.
    expect(
      validateCommit(
        expense({ amount: "10000000000", currency: "USD" }),
        { rate: 3.3 },
      ),
    ).toEqual({
      ok: false,
      reason: "amount_too_large",
    });
  });

  it("rejects USD when no effective rate is available", () => {
    expect(validateCommit(expense({ currency: "USD" }))).toEqual({
      ok: false,
      reason: "currency_rate_unavailable",
    });
    expect(validateCommit(expense({ currency: "USD" }), { rate: -1 })).toEqual({
      ok: false,
      reason: "currency_rate_unavailable",
    });
  });

  it("ignores an injected rate for BYN drafts", () => {
    expect(validateCommit(income(), { rate: 3.3 })).toMatchObject({
      currency: "BYN",
      fxRate: null,
      amount: 100,
      originalAmount: 100,
    });
  });

  it("canCommit stays enabled for USD without a resolved rate (server decides)", () => {
    expect(canCommit(expense({ currency: "USD" }))).toBe(true);
    expect(canCommit(expense({ currency: "USD", amount: "" }))).toBe(false);
  });
});

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
      occurredOn: "2026-08-05",
      categoryId: "cat-1",
      note: null,
    });
  });

  it("accepts a complete manual Income without Category", () => {
    expect(validateCommit(income())).toEqual({
      ok: true,
      amount: 100,
      occurredOn: "2026-08-05",
      categoryId: null,
      note: "зарплата",
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

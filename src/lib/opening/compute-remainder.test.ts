import { describe, expect, it } from "vitest";
import { computeRemainder } from "./compute-remainder";
import type { HistoryItem } from "@/lib/money/history-types";
import type { Opening } from "./types";

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

const opening = (amount: number, openedOn: string): Opening => ({
  amount,
  openedOn,
});

describe("computeRemainder", () => {
  it("returns null when Opening is absent (not 0)", () => {
    expect(computeRemainder(null, [expense(10, "2026-08-01")])).toBeNull();
    expect(computeRemainder(null, [])).toBeNull();
  });

  it("returns the Opening amount when there are no committed items", () => {
    expect(computeRemainder(opening(250.5, "2026-08-10"), [])).toBe(250.5);
  });

  it("treats Opening amount 0 as a real Remainder of 0", () => {
    expect(computeRemainder(opening(0, "2026-08-10"), [])).toBe(0);
  });

  it("adds committed Incomes and subtracts committed Expenses on or after the Opening date", () => {
    const items = [
      income(2100, "2026-08-12", "i1"),
      expense(48.2, "2026-08-14", "e1"),
      expense(12.5, "2026-08-10", "e2"),
    ];
    expect(computeRemainder(opening(100, "2026-08-10"), items)).toBe(2139.3);
  });

  it("ignores committed records whose Occurred on is before the Opening date", () => {
    const items = [
      expense(50, "2026-08-09", "e-before"),
      income(20, "2026-08-09", "i-before"),
      expense(10, "2026-08-10", "e-on"),
    ];
    expect(computeRemainder(opening(100, "2026-08-10"), items)).toBe(90);
  });

  it("includes records whose Occurred on is the Opening date", () => {
    expect(
      computeRemainder(opening(40, "2026-08-10"), [
        expense(5, "2026-08-10"),
      ]),
    ).toBe(35);
  });

  it("excludes today's records when Opening date is tomorrow", () => {
    const items = [
      expense(30, "2026-08-14", "e-today"),
      income(10, "2026-08-15", "i-tomorrow"),
    ];
    expect(computeRemainder(opening(200, "2026-08-15"), items)).toBe(210);
  });

  it("allows Remainder to go negative", () => {
    expect(
      computeRemainder(opening(20, "2026-08-01"), [
        expense(50, "2026-08-02"),
      ]),
    ).toBe(-30);
  });

  it("rounds to 2 decimal places like Monthly total", () => {
    expect(
      computeRemainder(opening(10.1, "2026-08-01"), [
        expense(0.1, "2026-08-01", "e1"),
        expense(0.2, "2026-08-01", "e2"),
      ]),
    ).toBe(9.8);
  });
});

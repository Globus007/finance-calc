import { describe, expect, it } from "vitest";
import {
  currentYearMonth,
  monthDateBounds,
  monthLabelRu,
  resolveYearMonth,
  shiftYearMonth,
} from "./minsk-month";

describe("currentYearMonth", () => {
  it("returns YYYY-MM for the calendar month in Europe/Minsk, not UTC", () => {
    // 2026-03-31 22:00 UTC = 2026-04-01 01:00 in Minsk (UTC+3)
    const utcNearMonthEnd = new Date("2026-03-31T22:00:00.000Z");
    expect(currentYearMonth(utcNearMonthEnd)).toBe("2026-04");
  });

  it("returns the Minsk month for a mid-day instant", () => {
    // 2026-08-05 12:00 Minsk = 09:00 UTC
    const midday = new Date("2026-08-05T09:00:00.000Z");
    expect(currentYearMonth(midday)).toBe("2026-08");
  });
});

describe("monthDateBounds", () => {
  it("returns inclusive calendar-month start and end as YYYY-MM-DD", () => {
    expect(monthDateBounds("2026-08")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("handles February in a non-leap year", () => {
    expect(monthDateBounds("2026-02")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("handles February in a leap year", () => {
    expect(monthDateBounds("2024-02")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
  });
});

describe("shiftYearMonth", () => {
  it("moves forward and backward across year boundaries", () => {
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2025-12", 1)).toBe("2026-01");
  });
});

describe("monthLabelRu", () => {
  it("formats a year-month for Russian UI", () => {
    expect(monthLabelRu("2026-08")).toBe("Август 2026");
  });
});

describe("resolveYearMonth", () => {
  const fixed = new Date("2026-08-05T09:00:00.000Z"); // August in Minsk

  it("defaults to the current Europe/Minsk month when param is missing", () => {
    expect(resolveYearMonth(undefined, fixed)).toBe("2026-08");
    expect(resolveYearMonth(null, fixed)).toBe("2026-08");
    expect(resolveYearMonth("", fixed)).toBe("2026-08");
  });

  it("accepts a valid YYYY-MM calendar month", () => {
    expect(resolveYearMonth("2025-12", fixed)).toBe("2025-12");
    expect(resolveYearMonth("2026-01", fixed)).toBe("2026-01");
  });

  it("falls back to current month for invalid values", () => {
    expect(resolveYearMonth("not-a-month", fixed)).toBe("2026-08");
    expect(resolveYearMonth("2026-13", fixed)).toBe("2026-08");
    expect(resolveYearMonth("2026-00", fixed)).toBe("2026-08");
    expect(resolveYearMonth("26-08", fixed)).toBe("2026-08");
    expect(resolveYearMonth("2026-8", fixed)).toBe("2026-08");
  });
});

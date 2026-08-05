import { describe, expect, it } from "vitest";
import {
  currentYearMonth,
  monthDateBounds,
  monthLabelRu,
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

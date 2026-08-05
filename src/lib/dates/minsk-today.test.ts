import { describe, expect, it } from "vitest";
import { todayInMinsk } from "./minsk-today";

describe("todayInMinsk", () => {
  it("returns the calendar date in Europe/Minsk, not UTC", () => {
    // 2026-03-15 23:30 UTC = 2026-03-16 02:30 in Minsk (UTC+3)
    const utcEvening = new Date("2026-03-15T23:30:00.000Z");
    expect(todayInMinsk(utcEvening)).toBe("2026-03-16");
  });

  it("returns YYYY-MM-DD for a mid-day Minsk instant", () => {
    // 2026-08-05 12:00 Minsk = 09:00 UTC
    const midday = new Date("2026-08-05T09:00:00.000Z");
    expect(todayInMinsk(midday)).toBe("2026-08-05");
  });
});

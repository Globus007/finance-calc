import { describe, expect, it } from "vitest";
import { addCalendarDays, todayInMinsk, tomorrowInMinsk } from "./minsk-today";

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

describe("tomorrowInMinsk", () => {
  it("is the next Europe/Minsk calendar day after today", () => {
    const utcEvening = new Date("2026-03-15T23:30:00.000Z");
    expect(todayInMinsk(utcEvening)).toBe("2026-03-16");
    expect(tomorrowInMinsk(utcEvening)).toBe("2026-03-17");
  });
});

describe("addCalendarDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

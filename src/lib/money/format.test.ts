import { describe, expect, it } from "vitest";
import { formatByn, formatShortDate } from "./format";

describe("formatByn", () => {
  it("formats whole amounts with two fraction digits and Br suffix", () => {
    expect(formatByn(2100)).toBe("2\u00a0100,00\u00a0Br");
  });

  it("formats fractional amounts with two fraction digits", () => {
    expect(formatByn(48.2)).toBe("48,20\u00a0Br");
  });

  it("formats zero", () => {
    expect(formatByn(0)).toBe("0,00\u00a0Br");
  });
});

describe("formatShortDate", () => {
  it("formats YYYY-MM-DD as Russian short day + month", () => {
    // Fixed calendar date — no TZ shift (noon local construction avoided).
    expect(formatShortDate("2026-08-04")).toMatch(/4/);
    expect(formatShortDate("2026-08-04").toLowerCase()).toMatch(/авг/);
  });
});

import { describe, expect, it } from "vitest";
import { formatActiveRateLine, formatUsdRate } from "./format";

describe("formatUsdRate", () => {
  it("shows four fraction digits with comma separator", () => {
    expect(formatUsdRate(3.3012)).toBe("$1 = 3,3012");
    expect(formatUsdRate(3.35)).toBe("$1 = 3,3500");
  });
});

describe("formatActiveRateLine", () => {
  it("labels an NBRB rate with its day.month origin", () => {
    expect(
      formatActiveRateLine({
        rate: 3.3012,
        source: "nbrb",
        asOf: "2026-02-12T10:00:00.000Z",
      }),
    ).toMatch(/^\$1 = 3,3012 · NBRB 12\.02$/);
  });

  it("marks a manual override as own", () => {
    expect(
      formatActiveRateLine({
        rate: 3.35,
        source: "override",
        asOf: "2026-02-12T10:00:00.000Z",
      }),
    ).toBe("$1 = 3,3500 · own");
  });
});

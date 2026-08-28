import { describe, expect, it } from "vitest";
import {
  formatAmountBadge,
  formatByn,
  formatShortDate,
  formatUsdApprox,
} from "./format";

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

describe("formatUsdApprox", () => {
  it("formats whole dollars with the ≈ prefix", () => {
    expect(formatUsdApprox(10995.4)).toBe("≈ $10\u00a0995");
  });

  it("rounds half-up to whole dollars", () => {
    expect(formatUsdApprox(0.4)).toBe("≈ $0");
    expect(formatUsdApprox(1.5)).toBe("≈ $2");
  });

  it("keeps a minus sign for negative figures", () => {
    expect(formatUsdApprox(-2139.3)).toBe("≈ −$2\u00a0139");
  });
});

describe("formatAmountBadge", () => {
  it("shows whole-dollar originals without fraction digits", () => {
    expect(
      formatAmountBadge({ currency: "USD", originalAmount: 50, fxRate: 3.3012 }),
    ).toBe("$50 · по 3,30");
  });

  it("shows two digits for fractional originals and grouped amounts", () => {
    expect(
      formatAmountBadge({ currency: "USD", originalAmount: 50.5, fxRate: 3.35 }),
    ).toBe("$50,50 · по 3,35");
    expect(
      formatAmountBadge({ currency: "USD", originalAmount: 1250, fxRate: 3.3012 }),
    ).toBe("$1\u00a0250 · по 3,30");
  });

  it("shows the euro symbol for EUR snapshots", () => {
    expect(
      formatAmountBadge({ currency: "EUR", originalAmount: 40, fxRate: 3.5 }),
    ).toBe("€40 · по 3,50");
  });
});

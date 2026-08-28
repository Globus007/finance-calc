import { describe, expect, it } from "vitest";
import { toByn } from "./convert";
import type { RateMap } from "./convert";

const usd: RateMap = {
  USD: { rate: 3.3, source: "override", asOf: "2026-08-16T00:00:00.000Z" },
};

describe("toByn", () => {
  it("leaves BYN untouched", () => {
    expect(toByn(12.345, "BYN", {})).toBe(12.35);
  });

  it("converts at the injected rate", () => {
    expect(toByn(10, "USD", usd)).toBe(33);
  });

  it("returns null when the rate is missing instead of a 1:1 stand-in", () => {
    expect(toByn(10, "USD", {})).toBeNull();
    expect(toByn(10, "EUR", usd)).toBeNull();
  });
});

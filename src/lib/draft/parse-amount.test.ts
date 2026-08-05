import { describe, expect, it } from "vitest";
import { parseAmount } from "./parse-amount";

describe("parseAmount", () => {
  it("parses positive BYN with dot or comma", () => {
    expect(parseAmount("12.50")).toBe(12.5);
    expect(parseAmount("12,50")).toBe(12.5);
    expect(parseAmount(" 3 ")).toBe(3);
  });

  it("rejects empty, zero, negative, and non-numeric", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("0.00")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1e2")).toBeNull();
  });

  it("rounds to two decimal places", () => {
    expect(parseAmount("1.005")).toBe(1.01);
    expect(parseAmount("1.004")).toBe(1);
  });
});

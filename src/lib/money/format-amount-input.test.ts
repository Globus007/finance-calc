import { describe, expect, it } from "vitest";
import { formatAmountInput } from "./format-amount-input";

describe("formatAmountInput", () => {
  it("formats two decimal places for the edit form", () => {
    expect(formatAmountInput(48.2)).toBe("48.20");
    expect(formatAmountInput(2100)).toBe("2100.00");
  });

  it("returns empty string for non-finite values", () => {
    expect(formatAmountInput(Number.NaN)).toBe("");
  });
});

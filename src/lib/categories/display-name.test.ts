import { describe, expect, it } from "vitest";
import {
  isBlankDisplayName,
  isDuplicateDisplayName,
  normalizeDisplayName,
} from "./display-name";

describe("normalizeDisplayName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeDisplayName("  Моё   хобби  ")).toBe("Моё хобби");
  });
});

describe("isBlankDisplayName", () => {
  it("treats whitespace-only as blank", () => {
    expect(isBlankDisplayName("")).toBe(true);
    expect(isBlankDisplayName("   ")).toBe(true);
    expect(isBlankDisplayName("А")).toBe(false);
  });
});

describe("isDuplicateDisplayName", () => {
  const existing = [
    { id: "1", displayName: "Продукты" },
    { id: "2", displayName: "Хобби" },
  ];

  it("detects case-insensitive conflicts across visible and hidden", () => {
    expect(isDuplicateDisplayName("продукты", existing)).toBe(true);
    expect(isDuplicateDisplayName("ХОББИ", existing)).toBe(true);
    expect(isDuplicateDisplayName("Спорт", existing)).toBe(false);
  });

  it("ignores the Category being renamed", () => {
    expect(isDuplicateDisplayName("хобби", existing, "2")).toBe(false);
    expect(isDuplicateDisplayName("продукты", existing, "2")).toBe(true);
  });
});

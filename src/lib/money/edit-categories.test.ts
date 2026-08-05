import { describe, expect, it } from "vitest";
import { categoriesForExpenseEdit } from "./edit-categories";

const visible = [
  { id: "v1", displayName: "Продукты" },
  { id: "v2", displayName: "Прочее" },
];

describe("categoriesForExpenseEdit", () => {
  it("returns visible Categories when current is already visible", () => {
    const result = categoriesForExpenseEdit(visible, {
      id: "v1",
      displayName: "Продукты",
    });
    expect(result).toEqual(visible);
  });

  it("includes hidden current Category alongside visible ones", () => {
    const result = categoriesForExpenseEdit(visible, {
      id: "hidden-1",
      displayName: "Старая",
    });
    expect(result).toEqual([
      ...visible,
      { id: "hidden-1", displayName: "Старая" },
    ]);
  });

  it("returns only visible when there is no current Category", () => {
    expect(categoriesForExpenseEdit(visible, null)).toEqual(visible);
  });
});

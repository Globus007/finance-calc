import { describe, expect, it } from "vitest";
import {
  CATEGORY_PAGE_SIZE,
  categoryPickerKeyboard,
  encodeCategoryPick,
  parseCategoryPage,
  parseCategoryPick,
  resolveCategoryByIndex,
} from "./category-keyboard";

const cats = Array.from({ length: CATEGORY_PAGE_SIZE + 2 }, (_, i) => ({
  id: `id-${i}`,
  displayName: `Cat ${i}`,
}));

describe("categoryPickerKeyboard", () => {
  it("uses short callback_data under 64 bytes and absolute indices", () => {
    const kb = categoryPickerKeyboard({ categories: cats, page: 0 });
    const codes = kb.inline_keyboard.flat().map((b) => b.callback_data);
    for (const code of codes) {
      expect(Buffer.byteLength(code, "utf8")).toBeLessThanOrEqual(64);
    }
    expect(codes).toContain(encodeCategoryPick(0));
    expect(parseCategoryPick(encodeCategoryPick(0))).toBe(0);
  });

  it("paginates and resolves picks by absolute index", () => {
    const page1 = categoryPickerKeyboard({ categories: cats, page: 1 });
    const codes = page1.inline_keyboard.flat().map((b) => b.callback_data);
    expect(codes).toContain(encodeCategoryPick(CATEGORY_PAGE_SIZE));
    expect(parseCategoryPage("gp:0")).toBe(0);
    expect(resolveCategoryByIndex(cats, CATEGORY_PAGE_SIZE)?.id).toBe(
      `id-${CATEGORY_PAGE_SIZE}`,
    );
  });
});

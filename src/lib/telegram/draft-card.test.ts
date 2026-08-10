import { describe, expect, it } from "vitest";
import {
  CB_COMMIT,
  CB_DISCARD,
  CB_EDIT_AMOUNT,
  CB_EDIT_NOTE,
  CB_EDIT_OCCURRED_ON,
  draftCardKeyboard,
  formatDraftCardText,
} from "./draft-card";
import type { Draft } from "@/lib/draft/types";
import { CB_OPEN_CATEGORY } from "./category-keyboard";

const draft: Draft = {
  kind: "expense",
  channel: "photo",
  amount: "12.50",
  occurredOn: "2026-08-10",
  categoryId: "cat-1",
  note: "кофе",
};

describe("formatDraftCardText", () => {
  it("includes amount, date, category, note and expense-only label", () => {
    const text = formatDraftCardText({
      draft,
      categoryName: "Прочее",
    });
    expect(text).toContain("12");
    expect(text).toContain("2026-08-10");
    expect(text).toContain("Прочее");
    expect(text).toContain("кофе");
    expect(text).toContain("Расход");
    expect(text).not.toContain("SPIKE");
    expect(text).not.toContain("Доход");
  });

  it("labels voice channel", () => {
    const text = formatDraftCardText({
      draft: { ...draft, channel: "voice" },
      categoryName: "Прочее",
    });
    expect(text).toContain("голос");
  });
});

describe("draftCardKeyboard", () => {
  it("exposes commit, discard, field edits, category under 64 bytes", () => {
    const kb = draftCardKeyboard();
    const flat = kb.inline_keyboard.flat();
    const codes = flat.map((b) => b.callback_data);
    expect(codes).toContain(CB_COMMIT);
    expect(codes).toContain(CB_DISCARD);
    expect(codes).toContain(CB_EDIT_AMOUNT);
    expect(codes).toContain(CB_EDIT_OCCURRED_ON);
    expect(codes).toContain(CB_EDIT_NOTE);
    expect(codes).toContain(CB_OPEN_CATEGORY);
    for (const b of flat) {
      expect(Buffer.byteLength(b.callback_data, "utf8")).toBeLessThanOrEqual(
        64,
      );
    }
  });
});

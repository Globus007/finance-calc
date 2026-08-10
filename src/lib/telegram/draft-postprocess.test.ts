import { describe, expect, it } from "vitest";
import {
  applyCaptionNoteIfEmpty,
  forceExpenseDraft,
} from "./draft-postprocess";
import type { Draft } from "@/lib/draft/types";

const expense: Draft = {
  kind: "expense",
  channel: "photo",
  amount: "10.00",
  occurredOn: "2026-08-10",
  categoryId: "cat-food",
  note: "",
};

describe("forceExpenseDraft", () => {
  it("keeps expense and fills empty category with fallback", () => {
    const d = forceExpenseDraft(
      { ...expense, categoryId: "" },
      "cat-fallback",
    );
    expect(d.kind).toBe("expense");
    expect(d.categoryId).toBe("cat-fallback");
  });

  it("converts income voice draft to expense with fallback category", () => {
    const d = forceExpenseDraft(
      {
        kind: "income",
        channel: "voice",
        amount: "100.00",
        occurredOn: "2026-08-10",
        categoryId: "",
        note: "зарплата",
      },
      "cat-fallback",
    );
    expect(d).toEqual({
      kind: "expense",
      channel: "voice",
      amount: "100.00",
      occurredOn: "2026-08-10",
      categoryId: "cat-fallback",
      note: "зарплата",
    });
  });
});

describe("applyCaptionNoteIfEmpty", () => {
  it("fills note from caption when extract note empty", () => {
    expect(applyCaptionNoteIfEmpty(expense, "  кофе  ").note).toBe("кофе");
  });

  it("does not overwrite extract note", () => {
    const d = applyCaptionNoteIfEmpty(
      { ...expense, note: "Евроопт" },
      "caption",
    );
    expect(d.note).toBe("Евроопт");
  });
});

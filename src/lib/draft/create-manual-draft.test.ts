import { describe, expect, it } from "vitest";
import { createManualDraft } from "./create-manual-draft";

describe("createManualDraft", () => {
  const fixed = new Date("2026-08-05T09:00:00.000Z");

  it("opens an Expense Draft with manual Channel, empty Amount and Category, today Minsk", () => {
    expect(createManualDraft("expense", fixed)).toEqual({
      kind: "expense",
      channel: "manual",
      amount: "",
      occurredOn: "2026-08-05",
      categoryId: "",
      note: "",
    });
  });

  it("opens an Income Draft with no Category field used, manual Channel", () => {
    const draft = createManualDraft("income", fixed);
    expect(draft).toEqual({
      kind: "income",
      channel: "manual",
      amount: "",
      occurredOn: "2026-08-05",
      categoryId: "",
      note: "",
    });
  });
});

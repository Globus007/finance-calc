import { describe, expect, it, vi } from "vitest";
import { extractDraft, type ExtractDraftDeps } from "./extract-draft";

const VISIBLE = [
  { id: "cat-other", displayName: "Прочее" },
  { id: "cat-food", displayName: "Еда" },
];

const okContext = () =>
  Promise.resolve({
    ok: true as const,
    visibleCategories: VISIBLE,
    systemFallbackCategoryId: "cat-other",
  });

const sampleBytes = new Uint8Array([1, 2, 3]);
const userPath = "user-1/abc-123.jpg";

function baseDeps(overrides: Partial<ExtractDraftDeps> = {}): ExtractDraftDeps {
  return {
    loadSession: async () => ({ userId: "user-1" }),
    loadCategoryContext: okContext,
    downloadTempObject: async () => ({
      bytes: sampleBytes,
      mimeType: "image/jpeg",
    }),
    deleteTempObject: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("extractDraft", () => {
  it("returns unauthenticated (no Draft) when session is missing", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({ loadSession: async () => ({ userId: null }), deleteTempObject: deleteTemp }),
    );
    expect(result).toEqual({ status: "error", reason: "unauthenticated" });
    // No purge attempted before ownership is established.
    expect(deleteTemp).not.toHaveBeenCalled();
  });

  it("returns invalid_path when the path is outside the user prefix", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: "other-user/x.jpg", channel: "photo" },
      baseDeps({ deleteTempObject: deleteTemp }),
    );
    expect(result).toEqual({ status: "error", reason: "invalid_path" });
    expect(deleteTemp).not.toHaveBeenCalled();
  });

  it("returns unavailable + purge when Category context is missing", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const download = vi.fn();
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({
        loadCategoryContext: async () => ({ ok: false as const }),
        deleteTempObject: deleteTemp,
        downloadTempObject: download,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "unavailable" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
    expect(download).not.toHaveBeenCalled();
  });

  it("returns extraction_failure + purge when download misses", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({ downloadTempObject: async () => null, deleteTempObject: deleteTemp }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("returns extraction_failure + purge on oversize photo", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({
        downloadTempObject: async () => ({
          bytes: new Uint8Array(5 * 1024 * 1024 + 1),
          mimeType: "image/jpeg",
        }),
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("returns extraction_failure + purge on oversize voice", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "voice" },
      baseDeps({
        downloadTempObject: async () => ({
          bytes: new Uint8Array(2 * 1024 * 1024 + 1),
          mimeType: "audio/webm",
        }),
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("returns extraction_failure + purge on wrong voice MIME", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "voice" },
      baseDeps({
        downloadTempObject: async () => ({
          bytes: sampleBytes,
          mimeType: "video/mp4",
        }),
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("photo success forces an Expense Draft and purges", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const raw = {
      record_kind: "income" as const,
      amount: 12.5,
      occurred_on: "2026-08-05",
      category_id: null,
      note: "Магазин",
    };
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({
        extractReceipt: async () => raw,
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({
      status: "ok",
      draft: {
        kind: "expense",
        channel: "photo",
        amount: "12.50",
        occurredOn: "2026-08-05",
        categoryId: "cat-other",
        note: "Магазин",
      },
      categories: VISIBLE,
    });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("voice success keeps model-proposed Income Draft and purges", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const raw = {
      record_kind: "income" as const,
      amount: 500,
      occurred_on: "2026-08-05",
      category_id: null,
      note: "зарплата",
    };
    const result = await extractDraft(
      { path: userPath, channel: "voice" },
      baseDeps({
        downloadTempObject: async () => ({
          bytes: sampleBytes,
          mimeType: "audio/webm",
        }),
        transcribe: async () => ({ text: "Получил зарплату 500" }),
        extractTranscript: async () => raw,
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({
      status: "ok",
      draft: {
        kind: "income",
        channel: "voice",
        amount: "500.00",
        occurredOn: "2026-08-05",
        categoryId: "",
        note: "зарплата",
      },
      categories: VISIBLE,
    });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("unusable transcript is extraction_failure + purge", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "voice" },
      baseDeps({
        downloadTempObject: async () => ({
          bytes: sampleBytes,
          mimeType: "audio/webm",
        }),
        transcribe: async () => ({ text: "   " }),
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("provider throw is extraction_failure + purge", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({
        extractReceipt: async () => {
          throw new Error("vision transport");
        },
        deleteTempObject: deleteTemp,
      }),
    );
    expect(result).toEqual({ status: "error", reason: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith(userPath);
  });

  it("successful normalize with null Amount is an ok Draft (ADR-0007)", async () => {
    const deleteTemp = vi.fn(async () => undefined);
    const raw = {
      record_kind: "expense" as const,
      amount: null,
      occurred_on: "2026-08-05",
      category_id: "cat-food",
      note: null,
    };
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({ extractReceipt: async () => raw, deleteTempObject: deleteTemp }),
    );
    expect(result).toEqual({
      status: "ok",
      draft: {
        kind: "expense",
        channel: "photo",
        amount: "",
        occurredOn: "2026-08-05",
        categoryId: "cat-food",
        note: "",
      },
      categories: VISIBLE,
    });
  });

  it("returns the same visible Category set used for mapping", async () => {
    const raw = {
      record_kind: "expense" as const,
      amount: 1,
      occurred_on: "2026-08-05",
      category_id: "cat-food",
      note: null,
    };
    const result = await extractDraft(
      { path: userPath, channel: "photo" },
      baseDeps({ extractReceipt: async () => raw }),
    );
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.draft.categoryId).toBe("cat-food");
    expect(result.categories).toBe(VISIBLE);
  });
});

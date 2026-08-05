import { describe, expect, it, vi } from "vitest";
import { runVoicePipeline } from "./run-voice-pipeline";

function makeBlob(type = "audio/webm", size = 100) {
  return new Blob([new Uint8Array(size)], { type });
}

describe("runVoicePipeline", () => {
  it("returns pre-capture offline before any upload", async () => {
    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => false,
        createUpload: vi.fn(),
      },
    });
    expect(result).toEqual({ status: "pre-capture", reason: "offline" });
  });

  it("maps oversize blob to pre-capture size", async () => {
    const big = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {
      type: "audio/webm",
    });
    const result = await runVoicePipeline(big, {
      deps: {
        isOnline: () => true,
        createUpload: vi.fn(),
      },
    });
    expect(result).toEqual({ status: "pre-capture", reason: "size" });
  });

  it("maps wrong mime to pre-capture type", async () => {
    const result = await runVoicePipeline(makeBlob("video/mp4"), {
      deps: {
        isOnline: () => true,
        createUpload: vi.fn(),
      },
    });
    expect(result).toEqual({ status: "pre-capture", reason: "type" });
  });

  it("opens confirm path on successful extract with income draft", async () => {
    const draft = {
      kind: "income" as const,
      channel: "voice" as const,
      amount: "500.00",
      occurredOn: "2026-08-05",
      categoryId: "",
      note: "зарплата",
    };
    const categories = [{ id: "cat-other", displayName: "Прочее" }];

    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => true,
        createUpload: async () => ({
          status: "ok",
          path: "user/id.webm",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => ({
          status: "ok",
          draft,
          categories,
        }),
      },
    });

    expect(result).toEqual({ status: "ok", draft, categories });
  });

  it("opens confirm with null Amount expense draft (not extraction failure)", async () => {
    const draft = {
      kind: "expense" as const,
      channel: "voice" as const,
      amount: "",
      occurredOn: "2026-08-05",
      categoryId: "cat-other",
      note: "",
    };
    const categories = [{ id: "cat-other", displayName: "Прочее" }];

    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => true,
        createUpload: async () => ({
          status: "ok",
          path: "user/id.webm",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => ({ status: "ok", draft, categories }),
      },
    });

    expect(result).toEqual({ status: "ok", draft, categories });
  });

  it("maps upload error after pipeline start to extraction_failure", async () => {
    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => true,
        createUpload: async () => ({
          status: "ok",
          path: "user/id.webm",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: new Error("network") }),
      },
    });
    expect(result).toEqual({ status: "extraction_failure" });
  });

  it("returns cancelled when aborted before extract settles", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runVoicePipeline(makeBlob(), {
      signal: controller.signal,
      deps: {
        isOnline: () => true,
      },
    });
    expect(result).toEqual({ status: "cancelled" });
  });

  it("maps extract failure to extraction_failure", async () => {
    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => true,
        createUpload: async () => ({
          status: "ok",
          path: "user/id.webm",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => ({
          status: "error",
          reason: "extraction_failure",
        }),
      },
    });
    expect(result).toEqual({ status: "extraction_failure" });
  });

  it("deletes temp object when extract rejects after upload", async () => {
    const deleteTemp = vi.fn(async () => ({ status: "ok" as const }));
    const result = await runVoicePipeline(makeBlob(), {
      deps: {
        isOnline: () => true,
        createUpload: async () => ({
          status: "ok",
          path: "user/id.webm",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => {
          throw new Error("network");
        },
        deleteTemp,
      },
    });
    expect(result).toEqual({ status: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith({ path: "user/id.webm" });
  });
});

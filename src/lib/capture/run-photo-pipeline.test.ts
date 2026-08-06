import { describe, expect, it, vi } from "vitest";
import { runPhotoPipeline } from "./run-photo-pipeline";

function makeFile(name = "receipt.jpg", type = "image/jpeg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("runPhotoPipeline", () => {
  it("returns pre-capture offline before any upload", async () => {
    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => false,
        compress: vi.fn(),
        createUpload: vi.fn(),
      },
    });
    expect(result).toEqual({ status: "pre-capture", reason: "offline" });
  });

  it("maps compress type failure to pre-capture type", async () => {
    const result = await runPhotoPipeline(makeFile("x.gif", "image/gif"), {
      deps: {
        isOnline: () => true,
        compress: async () => ({ ok: false, reason: "type" }),
      },
    });
    expect(result).toEqual({ status: "pre-capture", reason: "type" });
  });

  it("opens confirm path on successful extract with null Amount draft", async () => {
    const draft = {
      kind: "expense" as const,
      channel: "photo" as const,
      amount: "",
      occurredOn: "2026-08-05",
      categoryId: "cat-other",
      note: "",
    };
    const categories = [{ id: "cat-other", displayName: "Прочее" }];

    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
        createUpload: async () => ({
          status: "ok",
          path: "user/id.jpg",
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

  it("maps upload error after pipeline start to extraction_failure", async () => {
    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
        createUpload: async () => ({
          status: "ok",
          path: "user/id.jpg",
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
    const result = await runPhotoPipeline(makeFile(), {
      signal: controller.signal,
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
      },
    });
    expect(result).toEqual({ status: "cancelled" });
  });

  it("maps extract failure to extraction_failure", async () => {
    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
        createUpload: async () => ({
          status: "ok",
          path: "user/id.jpg",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => ({ status: "error", reason: "extraction_failure" }),
      },
    });
    expect(result).toEqual({ status: "extraction_failure" });
  });

  it("deletes temp object when extract rejects after upload", async () => {
    const deleteTemp = vi.fn(async () => ({ status: "ok" as const }));
    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
        createUpload: async () => ({
          status: "ok",
          path: "user/id.jpg",
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
    expect(deleteTemp).toHaveBeenCalledWith({ path: "user/id.jpg" });
  });

  it("client-purges temp when extract returns unauthenticated (no server purge)", async () => {
    const deleteTemp = vi.fn(async () => ({ status: "ok" as const }));
    const result = await runPhotoPipeline(makeFile(), {
      deps: {
        isOnline: () => true,
        compress: async () => ({
          ok: true,
          blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
          mime: "image/jpeg",
        }),
        createUpload: async () => ({
          status: "ok",
          path: "user/id.jpg",
          token: "tok",
        }),
        uploadBlob: async () => ({ error: null }),
        extract: async () => ({ status: "error", reason: "unauthenticated" }),
        deleteTemp,
      },
    });
    expect(result).toEqual({ status: "extraction_failure" });
    expect(deleteTemp).toHaveBeenCalledWith({ path: "user/id.jpg" });
  });
});

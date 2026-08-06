import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createExtractLogger,
  errorNameAndMessage,
  fieldPresenceFromDraft,
  objectNameFromPath,
  truncateErrorMessage,
} from "./extract-log";
import type { Draft } from "@/lib/draft/types";

vi.mock("@/lib/honeybadger/server", () => ({
  getServerHoneybadger: () => ({
    config: { apiKey: undefined },
    addBreadcrumb: vi.fn(),
    notify: vi.fn(),
  }),
}));

describe("objectNameFromPath", () => {
  it("strips user prefix", () => {
    expect(
      objectNameFromPath(
        "1516fa6d-acd0-4fc5-ba22-9bf629f341f8/27bb5abe-1bd8-4c1e-87e7-968f56f6f7b6.webm",
      ),
    ).toBe("27bb5abe-1bd8-4c1e-87e7-968f56f6f7b6.webm");
  });

  it("returns basename when no slash", () => {
    expect(objectNameFromPath("only.webm")).toBe("only.webm");
  });
});

describe("fieldPresenceFromDraft", () => {
  it("flags non-empty fields without exposing values", () => {
    const draft: Draft = {
      kind: "expense",
      channel: "voice",
      amount: "12.50",
      occurredOn: "2026-08-06",
      categoryId: "cat-1",
      note: "secret coffee",
    };
    expect(fieldPresenceFromDraft(draft)).toEqual({
      amount_present: true,
      occurred_on_present: true,
      category_set: true,
      record_kind: "expense",
    });
  });

  it("flags empty amount/category", () => {
    const draft: Draft = {
      kind: "income",
      channel: "voice",
      amount: "",
      occurredOn: "2026-08-06",
      categoryId: "  ",
      note: "",
    };
    expect(fieldPresenceFromDraft(draft)).toEqual({
      amount_present: false,
      occurred_on_present: true,
      category_set: false,
      record_kind: "income",
    });
  });
});

describe("truncateErrorMessage", () => {
  it("collapses whitespace and truncates", () => {
    const long = `x${"a".repeat(250)}`;
    const out = truncateErrorMessage(long, 20);
    expect(out.length).toBe(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("errorNameAndMessage", () => {
  it("reads Error instances", () => {
    expect(errorNameAndMessage(new TypeError("boom"))).toEqual({
      error_name: "TypeError",
      error_message: "boom",
    });
  });
});

describe("createExtractLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs success as info JSON without field values", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const log = createExtractLogger({
      channel: "voice",
      path: "user-id/obj.webm",
      attempt_id: "attempt-1",
    });
    log.setTiming("stt", 12.4);
    log.success({
      field_presence: {
        amount_present: true,
        occurred_on_present: false,
        category_set: false,
        record_kind: "expense",
      },
      models: { stt: "openai/gpt-4o-mini-transcribe" },
    });

    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0]?.[1]);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.outcome).toBe("ok");
    expect(parsed.attempt_id).toBe("attempt-1");
    expect(parsed.object_name).toBe("obj.webm");
    expect(parsed.channel).toBe("voice");
    expect(line).not.toContain("secret");
    expect(line).not.toContain("user-id");
  });

  it("logs fail as error with reason and truncated message", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = createExtractLogger({
      channel: "photo",
      path: "u/file.jpg",
      attempt_id: "a2",
    });
    log.fail({
      step: "vision",
      reason: "vision_failed",
      err: new Error("Gateway unauthorized"),
    });

    expect(error).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(String(error.mock.calls[0]?.[1])) as {
      reason: string;
      error_message: string;
      step: string;
    };
    expect(parsed.reason).toBe("vision_failed");
    expect(parsed.step).toBe("vision");
    expect(parsed.error_message).toContain("Gateway unauthorized");
  });

  it("logs early unauthenticated as warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = createExtractLogger({
      channel: "voice",
      path: "u/x.webm",
      attempt_id: "a3",
    });
    log.early("unauthenticated");
    expect(warn).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(String(warn.mock.calls[0]?.[1])) as {
      outcome: string;
      reason: string;
    };
    expect(parsed.outcome).toBe("early");
    expect(parsed.reason).toBe("unauthenticated");
  });
});

import { describe, expect, it } from "vitest";
import { FALLBACK_STT_MODEL, FALLBACK_TEXT_EXTRACT_MODEL } from "./schema";

describe("voice extract model defaults", () => {
  it("defaults STT to gpt-4o-mini-transcribe via gateway id", () => {
    expect(FALLBACK_STT_MODEL).toBe("openai/gpt-4o-mini-transcribe");
  });

  it("defaults post-STT text extract model", () => {
    expect(FALLBACK_TEXT_EXTRACT_MODEL.length).toBeGreaterThan(0);
  });
});

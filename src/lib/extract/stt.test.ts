import { describe, expect, it } from "vitest";
import { isUsableTranscript } from "./stt";

describe("isUsableTranscript", () => {
  it("rejects empty and whitespace-only", () => {
    expect(isUsableTranscript("")).toBe(false);
    expect(isUsableTranscript("   \n\t")).toBe(false);
  });

  it("accepts non-empty transcript", () => {
    expect(isUsableTranscript("Потратил 20 на кофе")).toBe(true);
  });
});

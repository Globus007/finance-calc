import { describe, expect, it } from "vitest";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_SECONDS,
  buildVoiceObjectPath,
  checkVoiceFileMeta,
  pickRecorderMimeType,
  voiceExtForMime,
} from "./voice-limits";
import { isUserCapturePath } from "./photo-limits";

describe("checkVoiceFileMeta", () => {
  it("accepts common voice MIME within 2 MB", () => {
    expect(
      checkVoiceFileMeta({ mimeType: "audio/webm", sizeBytes: 1000 }),
    ).toEqual({ ok: true, mime: "audio/webm" });
    expect(
      checkVoiceFileMeta({
        mimeType: "audio/webm;codecs=opus",
        sizeBytes: VOICE_MAX_BYTES,
      }),
    ).toEqual({ ok: true, mime: "audio/webm" });
    expect(
      checkVoiceFileMeta({ mimeType: "audio/mp4", sizeBytes: 1 }),
    ).toEqual({ ok: true, mime: "audio/mp4" });
    expect(
      checkVoiceFileMeta({ mimeType: "audio/m4a", sizeBytes: 500 }),
    ).toEqual({ ok: true, mime: "audio/x-m4a" });
  });

  it("rejects wrong type or oversize", () => {
    expect(
      checkVoiceFileMeta({ mimeType: "video/webm", sizeBytes: 100 }),
    ).toEqual({ ok: false, reason: "type" });
    expect(
      checkVoiceFileMeta({
        mimeType: "audio/webm",
        sizeBytes: VOICE_MAX_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "size" });
    expect(
      checkVoiceFileMeta({ mimeType: "audio/webm", sizeBytes: 0 }),
    ).toEqual({ ok: false, reason: "size" });
  });
});

describe("buildVoiceObjectPath", () => {
  it("uses user prefix and mime extension", () => {
    expect(buildVoiceObjectPath("u1", "audio/webm", "id1")).toBe(
      "u1/id1.webm",
    );
    expect(buildVoiceObjectPath("u1", "audio/mp4", "id2")).toBe("u1/id2.m4a");
    expect(buildVoiceObjectPath("u1", "audio/mpeg", "id3")).toBe("u1/id3.mp3");
  });
});

describe("voiceExtForMime", () => {
  it("maps mime to storage extension", () => {
    expect(voiceExtForMime("audio/ogg")).toBe("ogg");
    expect(voiceExtForMime("audio/wav")).toBe("wav");
  });
});

describe("isUserCapturePath (shared with photo)", () => {
  const user = "11111111-1111-1111-1111-111111111111";

  it("accepts voice object under user prefix", () => {
    expect(isUserCapturePath(user, `${user}/abc.webm`)).toBe(true);
  });
});

describe("pickRecorderMimeType", () => {
  it("picks first supported candidate", () => {
    expect(
      pickRecorderMimeType((t) => t === "audio/mp4"),
    ).toBe("audio/mp4");
  });

  it("returns empty when none supported (browser default)", () => {
    expect(pickRecorderMimeType(() => false)).toBe("");
  });
});

describe("VOICE_MAX_SECONDS", () => {
  it("is ~60 s soft cap", () => {
    expect(VOICE_MAX_SECONDS).toBe(60);
  });
});

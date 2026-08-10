import { describe, expect, it } from "vitest";
import {
  checkDownloadedPhoto,
  checkDownloadedVoice,
  guessPhotoMime,
  guessVoiceMime,
  preCaptureFromMessage,
} from "./pre-capture";
import type { TelegramMessage } from "./bot-api";
import { PHOTO_MAX_BYTES } from "@/lib/capture/photo-limits";
import { VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from "@/lib/capture/voice-limits";

function baseMessage(
  partial: Partial<TelegramMessage>,
): TelegramMessage {
  return {
    message_id: 1,
    date: 0,
    chat: { id: 1, type: "private" },
    from: { id: 42 },
    ...partial,
  };
}

describe("preCaptureFromMessage", () => {
  it("accepts largest photo under size limit", () => {
    const result = preCaptureFromMessage(
      baseMessage({
        photo: [
          {
            file_id: "small",
            file_unique_id: "s",
            width: 10,
            height: 10,
            file_size: 100,
          },
          {
            file_id: "big",
            file_unique_id: "b",
            width: 100,
            height: 100,
            file_size: 1000,
          },
        ],
      }),
    );
    expect(result).toEqual({
      ok: true,
      channel: "photo",
      fileId: "big",
      fileSize: 1000,
    });
  });

  it("rejects photo oversize from metadata", () => {
    const result = preCaptureFromMessage(
      baseMessage({
        photo: [
          {
            file_id: "x",
            file_unique_id: "x",
            width: 1,
            height: 1,
            file_size: PHOTO_MAX_BYTES + 1,
          },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, reason: "photo_oversize" });
  });

  it("accepts voice under duration and size", () => {
    const result = preCaptureFromMessage(
      baseMessage({
        voice: {
          file_id: "v1",
          duration: 30,
          mime_type: "audio/ogg",
          file_size: 50_000,
        },
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      channel: "voice",
      fileId: "v1",
      mimeType: "audio/ogg",
    });
  });

  it("rejects voice over duration or size", () => {
    expect(
      preCaptureFromMessage(
        baseMessage({
          voice: {
            file_id: "v",
            duration: VOICE_MAX_SECONDS + 1,
            file_size: 100,
          },
        }),
      ),
    ).toEqual({ ok: false, reason: "voice_too_long" });

    expect(
      preCaptureFromMessage(
        baseMessage({
          voice: {
            file_id: "v",
            duration: 10,
            file_size: VOICE_MAX_BYTES + 1,
          },
        }),
      ),
    ).toEqual({ ok: false, reason: "voice_oversize" });
  });

  it("rejects document as unsupported type", () => {
    expect(
      preCaptureFromMessage(
        baseMessage({
          document: { file_id: "d", mime_type: "image/jpeg" },
        }),
      ),
    ).toEqual({ ok: false, reason: "unsupported_type" });
  });
});

describe("post-download checks", () => {
  it("accepts photo jpeg within limit", () => {
    expect(
      checkDownloadedPhoto({
        sizeBytes: 1000,
        mimeType: "image/jpeg",
      }),
    ).toEqual({ ok: true, mime: "image/jpeg" });
  });

  it("accepts voice audio/ogg (Telegram voice notes)", () => {
    expect(
      checkDownloadedVoice({
        sizeBytes: 1000,
        mimeType: "audio/ogg",
      }),
    ).toEqual({ ok: true, mime: "audio/ogg" });
  });
});

describe("mime guess helpers", () => {
  it("guesses photo from path", () => {
    expect(guessPhotoMime("photos/file.png", null)).toBe("image/png");
    expect(guessPhotoMime("photos/file.jpg", null)).toBe("image/jpeg");
  });

  it("defaults voice to audio/ogg", () => {
    expect(guessVoiceMime(undefined, undefined, null)).toBe("audio/ogg");
    expect(guessVoiceMime("voice/file.oga", undefined, null)).toBe("audio/ogg");
  });
});

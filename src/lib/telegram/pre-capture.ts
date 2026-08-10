/**
 * Metadata-first pre-capture gates for bot media (ADR-0011).
 * Reject before download when Telegram already reports size/duration.
 */

import {
  PHOTO_MAX_BYTES,
  checkPhotoFileMeta,
  type PhotoMime,
} from "@/lib/capture/photo-limits";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_SECONDS,
  checkVoiceFileMeta,
  type VoiceMime,
} from "@/lib/capture/voice-limits";
import type { TelegramMessage, TelegramPhotoSize } from "./bot-api";

export type BotPreCaptureOk =
  | {
      ok: true;
      channel: "photo";
      fileId: string;
      fileSize?: number;
    }
  | {
      ok: true;
      channel: "voice";
      fileId: string;
      fileSize?: number;
      duration?: number;
      mimeType: string;
    };

export type BotPreCaptureFail = {
  ok: false;
  reason:
    | "unsupported_type"
    | "photo_oversize"
    | "voice_oversize"
    | "voice_too_long"
    | "missing_file";
};

export type BotPreCaptureResult = BotPreCaptureOk | BotPreCaptureFail;

/**
 * Inspect message metadata only — no getFile / download.
 * Accepts only message.photo (largest) and message.voice.
 */
export function preCaptureFromMessage(
  message: TelegramMessage,
): BotPreCaptureResult {
  if (message.photo?.length) {
    const largest = pickLargestPhotoMeta(message.photo);
    if (!largest) {
      return { ok: false, reason: "missing_file" };
    }
    if (
      largest.file_size != null &&
      largest.file_size > PHOTO_MAX_BYTES
    ) {
      return { ok: false, reason: "photo_oversize" };
    }
    return {
      ok: true,
      channel: "photo",
      fileId: largest.file_id,
      fileSize: largest.file_size,
    };
  }

  if (message.voice) {
    const voice = message.voice;
    if (voice.duration != null && voice.duration > VOICE_MAX_SECONDS) {
      return { ok: false, reason: "voice_too_long" };
    }
    if (voice.file_size != null && voice.file_size > VOICE_MAX_BYTES) {
      return { ok: false, reason: "voice_oversize" };
    }
    return {
      ok: true,
      channel: "voice",
      fileId: voice.file_id,
      fileSize: voice.file_size,
      duration: voice.duration,
      mimeType: voice.mime_type ?? "audio/ogg",
    };
  }

  // document / audio / video_note / sticker / etc. — not accepted in MVP.
  return { ok: false, reason: "unsupported_type" };
}

/** After download: re-check size + MIME (still pre-capture, not Extraction failure). */
export function checkDownloadedPhoto(input: {
  sizeBytes: number;
  mimeType: string;
}): { ok: true; mime: PhotoMime } | { ok: false; reason: "type" | "size" } {
  return checkPhotoFileMeta(input);
}

export function checkDownloadedVoice(input: {
  sizeBytes: number;
  mimeType: string;
}): { ok: true; mime: VoiceMime } | { ok: false; reason: "type" | "size" } {
  return checkVoiceFileMeta(input);
}

function pickLargestPhotoMeta(
  photo: TelegramPhotoSize[],
): TelegramPhotoSize | null {
  if (!photo.length) return null;
  return photo.reduce((best, cur) => {
    const bestArea = best.width * best.height;
    const curArea = cur.width * cur.height;
    if (curArea > bestArea) return cur;
    if (curArea === bestArea && (cur.file_size ?? 0) > (best.file_size ?? 0)) {
      return cur;
    }
    return best;
  });
}

/** Detect photo MIME from Telegram file_path extension or Content-Type. */
export function guessPhotoMime(
  filePath: string | undefined,
  contentType: string | null,
): string {
  if (contentType) {
    const bare = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
    if (bare.startsWith("image/")) return bare;
  }
  if (filePath?.endsWith(".png")) return "image/png";
  if (filePath?.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Detect voice MIME from Telegram metadata / file path. */
export function guessVoiceMime(
  filePath: string | undefined,
  reported: string | undefined,
  contentType: string | null,
): string {
  if (reported) return reported;
  if (contentType) {
    const bare = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
    if (bare.startsWith("audio/")) return bare;
  }
  if (filePath?.endsWith(".ogg") || filePath?.endsWith(".oga")) {
    return "audio/ogg";
  }
  if (filePath?.endsWith(".webm")) return "audio/webm";
  if (filePath?.endsWith(".mp3")) return "audio/mpeg";
  if (filePath?.endsWith(".m4a") || filePath?.endsWith(".mp4")) {
    return "audio/mp4";
  }
  return "audio/ogg";
}

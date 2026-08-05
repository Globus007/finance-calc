/** Voice Recording limits (ADR-0005). */

import {
  CAPTURE_TEMP_BUCKET,
  isUserCapturePath,
  normalizeMime,
} from "./photo-limits";

export { CAPTURE_TEMP_BUCKET, isUserCapturePath, normalizeMime };

/** Client + server hard ceiling for voice objects. */
export const VOICE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

/** Soft wall-clock cap while recording (~60 s, ADR-0005). */
export const VOICE_MAX_SECONDS = 60;

/**
 * MIME types MediaRecorder / mobile typically produce.
 * Server rejects anything outside this set.
 */
export const VOICE_ALLOWED_MIME = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
  "audio/mp3",
] as const;

export type VoiceMime = (typeof VOICE_ALLOWED_MIME)[number];

export type VoiceFileCheck =
  | { ok: true; mime: VoiceMime }
  | { ok: false; reason: "type" | "size" };

/** True when the MIME (with optional codecs param) is an allowed Recording type. */
export function isAllowedVoiceMime(mimeType: string): boolean {
  return canonicalVoiceMime(mimeType) !== null;
}

/**
 * Canonical storage/extension MIME after alias normalize.
 */
export function canonicalVoiceMime(mimeType: string): VoiceMime | null {
  const bare = normalizeMime(mimeType);
  if (bare === "audio/m4a" || bare === "audio/x-m4a") return "audio/x-m4a";
  if (bare === "audio/mp3") return "audio/mpeg";
  if ((VOICE_ALLOWED_MIME as readonly string[]).includes(bare)) {
    return bare as VoiceMime;
  }
  return null;
}

/**
 * Pre-capture / server reject check for Recording bytes metadata.
 */
export function checkVoiceFileMeta(input: {
  mimeType: string;
  sizeBytes: number;
}): VoiceFileCheck {
  const mime = canonicalVoiceMime(input.mimeType);
  if (!mime) {
    return { ok: false, reason: "type" };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > VOICE_MAX_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true, mime };
}

/** Build object path for a new Recording upload. */
export function buildVoiceObjectPath(
  userId: string,
  mime: VoiceMime,
  id: string = crypto.randomUUID(),
): string {
  const ext = voiceExtForMime(mime);
  return `${userId}/${id}.${ext}`;
}

export function voiceExtForMime(mime: VoiceMime): string {
  switch (mime) {
    case "audio/webm":
      return "webm";
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    case "audio/aac":
      return "aac";
    default:
      return "webm";
  }
}

/**
 * Prefer a MediaRecorder MIME the browser can produce.
 * Returns empty string if the browser should pick its default.
 */
export function pickRecorderMimeType(
  isTypeSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    try {
      if (isTypeSupported(c)) return c;
    } catch {
      // isTypeSupported may throw in some environments
    }
  }
  return "";
}

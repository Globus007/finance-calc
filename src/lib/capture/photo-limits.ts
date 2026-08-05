/** Photo Receipt limits (ADR-0005). */

export const CAPTURE_TEMP_BUCKET = "capture-temp";

/** Client + server hard ceiling for photo objects. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

export const PHOTO_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoMime = (typeof PHOTO_ALLOWED_MIME)[number];

export type PhotoFileCheck =
  | { ok: true; mime: PhotoMime }
  | { ok: false; reason: "type" | "size" };

/** Normalize Content-Type / File.type to a bare MIME (no parameters). */
export function normalizeMime(raw: string): string {
  return raw.toLowerCase().split(";")[0]?.trim() ?? "";
}

export function isAllowedPhotoMime(mimeType: string): mimeType is PhotoMime {
  return (PHOTO_ALLOWED_MIME as readonly string[]).includes(
    normalizeMime(mimeType),
  );
}

/**
 * Pre-capture / server reject check for Receipt bytes metadata.
 */
export function checkPhotoFileMeta(input: {
  mimeType: string;
  sizeBytes: number;
}): PhotoFileCheck {
  const mime = normalizeMime(input.mimeType);
  if (!isAllowedPhotoMime(mime)) {
    return { ok: false, reason: "type" };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > PHOTO_MAX_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true, mime };
}

/**
 * Storage object path must be `{userId}/{uuid}[...ext]`.
 * Extract API rejects paths outside the session user's prefix (ADR-0005).
 */
export function isUserCapturePath(userId: string, path: string): boolean {
  if (!userId || !path) return false;
  if (path.includes("..") || path.startsWith("/")) return false;
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  // Single segment under user folder (no nested folders for MVP).
  if (!rest || rest.includes("/")) return false;
  return true;
}

/** Build object path for a new Receipt upload. */
export function buildPhotoObjectPath(
  userId: string,
  mime: PhotoMime,
  id: string = crypto.randomUUID(),
): string {
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return `${userId}/${id}.${ext}`;
}

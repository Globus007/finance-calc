import {
  PHOTO_MAX_BYTES,
  type PhotoMime,
  isAllowedPhotoMime,
  normalizeMime,
} from "./photo-limits";

export type CompressResult =
  | { ok: true; blob: Blob; mime: PhotoMime }
  | { ok: false; reason: "type" | "size" | "decode" };

const MAX_EDGE_PX = 1600;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

/**
 * Client-side Receipt compress/resize: JPEG/PNG/WebP, ≤ 5 MB (ADR-0005).
 * Prefer JPEG re-encode for large photos; keep original if already within limits.
 */
export async function compressReceiptImage(file: File): Promise<CompressResult> {
  const sourceMime = normalizeMime(file.type || guessMimeFromName(file.name));
  if (!isAllowedPhotoMime(sourceMime)) {
    return { ok: false, reason: "type" };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "size" };
  }

  // Already within limits — use as-is (no quality loss).
  if (file.size <= PHOTO_MAX_BYTES) {
    return { ok: true, blob: file, mime: sourceMime };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, reason: "decode" };
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "decode" };
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Re-encode to JPEG for size control.
    let quality = INITIAL_QUALITY;
    let blob: Blob | null = null;
    while (quality >= MIN_QUALITY) {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= PHOTO_MAX_BYTES) {
        return { ok: true, blob, mime: "image/jpeg" };
      }
      quality -= 0.1;
    }

    // Last resort: smaller edge.
    const smaller = fitWithin(bitmap.width, bitmap.height, 1024);
    canvas.width = smaller.width;
    canvas.height = smaller.height;
    ctx.drawImage(bitmap, 0, 0, smaller.width, smaller.height);
    blob = await canvasToBlob(canvas, "image/jpeg", MIN_QUALITY);
    if (blob && blob.size <= PHOTO_MAX_BYTES) {
      return { ok: true, blob, mime: "image/jpeg" };
    }
    return { ok: false, reason: "size" };
  } finally {
    bitmap.close();
  }
}

function fitWithin(
  w: number,
  h: number,
  maxEdge: number,
): { width: number; height: number } {
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

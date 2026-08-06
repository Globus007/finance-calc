/**
 * Capture-temp helpers (ADR-0005).
 *
 * Lives with the other capture/temp utilities (limits, constraints), **not**
 * inside Extraction and not only on the photo action module. Extraction owns
 * the extract lifecycle; these helpers own signed-upload creation and the
 * cancel/orphan best-effort purge invoked from client pipelines.
 *
 * Two create-upload helpers (photo vs voice) keep MIME, limits, and path
 * builders channel-clear. One shared `deleteCaptureTempObject` so voice no
 * longer imports delete from the photo action module.
 *
 * These run server-side (Next `cookies()` session). App server-action modules
 * thin-wrap them under `"use server"` for stable client imports.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CAPTURE_TEMP_BUCKET,
  buildPhotoObjectPath,
  isAllowedPhotoMime,
  isUserCapturePath,
  looksLikeCaptureObjectPath,
  normalizeMime,
  type PhotoMime,
} from "./photo-limits";
import {
  buildVoiceObjectPath,
  canonicalVoiceMime,
  type VoiceMime,
} from "./voice-limits";

export type CreatePhotoUploadResult =
  | { status: "ok"; path: string; token: string }
  | { status: "error"; reason: "unauthenticated" | "unavailable" | "type" };

export type CreateVoiceUploadResult =
  | { status: "ok"; path: string; token: string }
  | { status: "error"; reason: "unauthenticated" | "unavailable" | "type" };

export type DeleteCaptureTempObjectResult =
  | { status: "ok" }
  | { status: "error"; reason: "invalid_path" };

type SessionResult = { userId: string | null };

async function requireSession(): Promise<SessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { userId: user?.id ?? null };
}

/**
 * Short-lived signed upload for a Receipt under `{user_id}/{uuid}.ext`.
 * Client uploads directly to Storage, then calls extractPhotoDraft (ADR-0005).
 */
export async function createPhotoUpload(input: {
  contentType: string;
}): Promise<CreatePhotoUploadResult> {
  const mime = normalizeMime(input.contentType);
  if (!isAllowedPhotoMime(mime)) {
    return { status: "error", reason: "type" };
  }

  const { userId } = await requireSession();
  if (!userId) return { status: "error", reason: "unauthenticated" };

  const path = buildPhotoObjectPath(userId, mime as PhotoMime);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CAPTURE_TEMP_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return { status: "error", reason: "unavailable" };
  }

  return { status: "ok", path: data.path ?? path, token: data.token };
}

/**
 * Short-lived signed upload for a Recording under `{user_id}/{uuid}.ext`.
 * Client uploads directly to Storage, then calls extractVoiceDraft (ADR-0005).
 */
export async function createVoiceUpload(input: {
  contentType: string;
}): Promise<CreateVoiceUploadResult> {
  const mime = canonicalVoiceMime(input.contentType);
  if (!mime) {
    return { status: "error", reason: "type" };
  }

  const { userId } = await requireSession();
  if (!userId) return { status: "error", reason: "unauthenticated" };

  const path = buildVoiceObjectPath(userId, mime as VoiceMime);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CAPTURE_TEMP_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return { status: "error", reason: "unavailable" };
  }

  return { status: "ok", path: data.path ?? path, token: data.token };
}

/**
 * Best-effort delete of a capture-temp object. Authenticated callers may only
 * delete within their own prefix; the session user owns the path. When the
 * session has expired mid-pipeline the object is an orphan (ADR-0005) — purge
 * it anyway so sensitive media does not linger until the bucket TTL. The path
 * was server-issued at createUpload time and is `{userUUID}/{objectUUID}.ext`,
 * so a structurally valid path is safe for the service role to delete (Storage
 * `remove` is delete-only and the bucket is private + 1h-TTL ephemeral).
 */
export async function deleteCaptureTempObject(input: {
  path: string;
}): Promise<DeleteCaptureTempObjectResult> {
  const { userId } = await requireSession();
  if (userId) {
    if (!isUserCapturePath(userId, input.path)) {
      return { status: "error", reason: "invalid_path" };
    }
  } else if (!looksLikeCaptureObjectPath(input.path)) {
    return { status: "error", reason: "invalid_path" };
  }
  await bestEffortDeleteStorageObject(input.path);
  return { status: "ok" };
}

/**
 * Best-effort delete of a capture-temp object **without** a session check.
 * Used by Extraction after ownership is already established. Errors are
 * swallowed — the bucket 1h TTL is the safety net (ADR-0005).
 */
export async function bestEffortDeleteStorageObject(path: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.storage.from(CAPTURE_TEMP_BUCKET).remove([path]);
  } catch {
    // Orphan TTL (1h) is the safety net (ADR-0005).
  }
}

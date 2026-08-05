"use server";

import {
  CAPTURE_TEMP_BUCKET,
  PHOTO_MAX_BYTES,
  buildPhotoObjectPath,
  isAllowedPhotoMime,
  isUserCapturePath,
  looksLikeCaptureObjectPath,
  normalizeMime,
  type PhotoMime,
} from "@/lib/capture/photo-limits";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Draft } from "@/lib/draft/types";
import {
  draftFromNormalized,
  normalizeExtract,
} from "@/lib/extract/normalize-extract";
import { extractReceiptFields } from "@/lib/extract/vision-receipt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreatePhotoUploadResult =
  | { status: "ok"; path: string; token: string }
  | { status: "error"; reason: "unauthenticated" | "unavailable" | "type" };

export type ExtractPhotoDraftResult =
  | {
      status: "ok";
      draft: Draft;
      categories: CategoryPickerItem[];
    }
  | {
      status: "error";
      reason:
        | "unauthenticated"
        | "invalid_path"
        | "extraction_failure"
        | "unavailable";
    };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null as null };
  }
  return { supabase, user };
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

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const path = buildPhotoObjectPath(user.id, mime as PhotoMime);

  const { data, error } = await supabase.storage
    .from(CAPTURE_TEMP_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return { status: "error", reason: "unavailable" };
  }

  return { status: "ok", path: data.path ?? path, token: data.token };
}

/**
 * Server: read temp object → vision extract → normalize → eager delete.
 * Success with null Amount still returns ok Draft for confirm (ADR-0007).
 * Deletes object on success and Extraction failure (ADR-0005).
 */
export async function extractPhotoDraft(input: {
  path: string;
}): Promise<ExtractPhotoDraftResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  if (!isUserCapturePath(user.id, input.path)) {
    return { status: "error", reason: "invalid_path" };
  }

  // Visible categories + system fallback for normalize (async-parallel).
  const [categoriesResult, fallbackResult] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_SELECT)
      .eq("is_hidden", false),
    supabase
      .from("categories")
      .select("id")
      .eq("is_system_fallback", true)
      .maybeSingle(),
  ]);

  if (categoriesResult.error || fallbackResult.error || !fallbackResult.data) {
    // Still try to delete the object if present.
    await bestEffortDelete(input.path);
    return { status: "error", reason: "unavailable" };
  }

  const categoryRows = (categoriesResult.data ?? []).map(mapCategoryRow);
  const visibleCategories = sortCategoriesForManage(categoryRows).map((c) => ({
    id: c.id,
    displayName: c.displayName,
  }));
  const systemFallbackCategoryId = fallbackResult.data.id as string;

  let bytes: Uint8Array;
  let mimeType: string;

  try {
    const admin = createAdminClient();
    const { data: blob, error: downloadError } = await admin.storage
      .from(CAPTURE_TEMP_BUCKET)
      .download(input.path);

    if (downloadError || !blob) {
      await bestEffortDelete(input.path);
      return { status: "error", reason: "extraction_failure" };
    }

    if (blob.size > PHOTO_MAX_BYTES) {
      await bestEffortDelete(input.path);
      return { status: "error", reason: "extraction_failure" };
    }

    const buffer = new Uint8Array(await blob.arrayBuffer());
    bytes = buffer;
    mimeType = blob.type || mimeFromPath(input.path);
  } catch {
    await bestEffortDelete(input.path);
    return { status: "error", reason: "extraction_failure" };
  }

  try {
    const raw = await extractReceiptFields({
      bytes,
      mimeType,
      visibleCategories,
    });

    const normalized = normalizeExtract({
      raw,
      channel: "photo",
      forceExpense: true,
      visibleCategories,
      systemFallbackCategoryId,
    });

    const draft = draftFromNormalized(normalized, "photo");

    return {
      status: "ok",
      draft,
      categories: visibleCategories satisfies CategoryPickerItem[],
    };
  } catch {
    return { status: "error", reason: "extraction_failure" };
  } finally {
    await bestEffortDelete(input.path);
  }
}

/**
 * Best-effort delete of a capture-temp object (cancel after upload, purge
 * after a non-ok extract, etc.). Authenticated callers may only delete within
 * their own prefix; the session user owns the path. When the session has
 * expired mid-pipeline the object is an orphan (ADR-0005) — purge it anyway so
 * sensitive media does not linger until the bucket TTL. The path was
 * server-issued at createUpload time and is `{userUUID}/{objectUUID}.ext`, so
 * a structurally valid path is safe for the service role to delete (Storage
 * `remove` is delete-only and the bucket is private + 1h-TTL ephemeral).
 */
export async function deleteCaptureTempObject(input: {
  path: string;
}): Promise<{ status: "ok" } | { status: "error"; reason: "invalid_path" }> {
  const { user } = await requireUser();
  if (user) {
    if (!isUserCapturePath(user.id, input.path)) {
      return { status: "error", reason: "invalid_path" };
    }
  } else if (!looksLikeCaptureObjectPath(input.path)) {
    return { status: "error", reason: "invalid_path" };
  }
  await bestEffortDelete(input.path);
  return { status: "ok" };
}

async function bestEffortDelete(path: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.storage.from(CAPTURE_TEMP_BUCKET).remove([path]);
  } catch {
    // Orphan TTL (1h) is the safety net (ADR-0005).
  }
}

function mimeFromPath(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

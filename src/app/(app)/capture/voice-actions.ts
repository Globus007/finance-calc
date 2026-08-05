"use server";

import {
  CAPTURE_TEMP_BUCKET,
  VOICE_MAX_BYTES,
  buildVoiceObjectPath,
  canonicalVoiceMime,
  isUserCapturePath,
  type VoiceMime,
} from "@/lib/capture/voice-limits";
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
import { isUsableTranscript, transcribeRecording } from "@/lib/extract/stt";
import { extractFromVoiceTranscript } from "@/lib/extract/voice-transcript";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateVoiceUploadResult =
  | { status: "ok"; path: string; token: string }
  | { status: "error"; reason: "unauthenticated" | "unavailable" | "type" };

export type ExtractVoiceDraftResult =
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

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const path = buildVoiceObjectPath(user.id, mime as VoiceMime);

  const { data, error } = await supabase.storage
    .from(CAPTURE_TEMP_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    return { status: "error", reason: "unavailable" };
  }

  return { status: "ok", path: data.path ?? path, token: data.token };
}

/**
 * Server: read temp object → STT → text extract → normalize → eager delete.
 * Success with null Amount still returns ok Draft for confirm (ADR-0007).
 * Empty/unusable transcript → Extraction failure.
 * Deletes object on success and Extraction failure (ADR-0005).
 */
export async function extractVoiceDraft(input: {
  path: string;
}): Promise<ExtractVoiceDraftResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  if (!isUserCapturePath(user.id, input.path)) {
    return { status: "error", reason: "invalid_path" };
  }

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

    if (blob.size > VOICE_MAX_BYTES) {
      await bestEffortDelete(input.path);
      return { status: "error", reason: "extraction_failure" };
    }

    const resolvedMime = blob.type || mimeFromPath(input.path);
    if (!canonicalVoiceMime(resolvedMime)) {
      await bestEffortDelete(input.path);
      return { status: "error", reason: "extraction_failure" };
    }

    const buffer = new Uint8Array(await blob.arrayBuffer());
    bytes = buffer;
    mimeType = resolvedMime;
  } catch {
    await bestEffortDelete(input.path);
    return { status: "error", reason: "extraction_failure" };
  }

  try {
    const { text } = await transcribeRecording({ bytes, mimeType });
    if (!isUsableTranscript(text)) {
      return { status: "error", reason: "extraction_failure" };
    }

    const raw = await extractFromVoiceTranscript({
      transcript: text,
      visibleCategories,
    });

    const normalized = normalizeExtract({
      raw,
      channel: "voice",
      forceExpense: false,
      visibleCategories,
      systemFallbackCategoryId,
    });

    const draft = draftFromNormalized(normalized, "voice");

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

async function bestEffortDelete(path: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.storage.from(CAPTURE_TEMP_BUCKET).remove([path]);
  } catch {
    // Orphan TTL (1h) is the safety net (ADR-0005).
  }
}

function mimeFromPath(path: string): string {
  if (path.endsWith(".webm")) return "audio/webm";
  if (path.endsWith(".m4a") || path.endsWith(".mp4")) return "audio/mp4";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".wav")) return "audio/wav";
  if (path.endsWith(".aac")) return "audio/aac";
  return "audio/webm";
}

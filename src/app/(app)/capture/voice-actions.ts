"use server";

import {
  createExtractLogger,
  fieldPresenceFromDraft,
  timed,
} from "@/lib/capture/extract-log";
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
import { getSttModel, getTextExtractModel } from "@/lib/extract/schema";
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
  const log = createExtractLogger({ channel: "voice", path: input.path });

  const { supabase, user } = await requireUser();
  if (!user) {
    log.early("unauthenticated");
    return { status: "error", reason: "unauthenticated" };
  }

  if (!isUserCapturePath(user.id, input.path)) {
    log.early("invalid_path");
    return { status: "error", reason: "invalid_path" };
  }

  log.breadcrumb("load_categories");
  const [categoriesResult, fallbackResult] = await timed(
    log,
    "load_categories",
    () =>
      Promise.all([
        supabase
          .from("categories")
          .select(CATEGORY_SELECT)
          .eq("is_hidden", false),
        supabase
          .from("categories")
          .select("id")
          .eq("is_system_fallback", true)
          .maybeSingle(),
      ]),
  );

  if (categoriesResult.error || fallbackResult.error || !fallbackResult.data) {
    await bestEffortDelete(input.path);
    log.early("categories_unavailable", "load_categories");
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

  log.breadcrumb("download");
  try {
    const admin = createAdminClient();
    const { data: blob, error: downloadError } = await timed(
      log,
      "download",
      async () =>
        admin.storage.from(CAPTURE_TEMP_BUCKET).download(input.path),
    );

    if (downloadError || !blob) {
      await bestEffortDelete(input.path);
      log.fail({
        step: "download",
        reason: "download_failed",
        err: downloadError
          ? new Error(downloadError.message)
          : new Error("empty blob"),
      });
      return { status: "error", reason: "extraction_failure" };
    }

    log.breadcrumb("validate_media");
    if (blob.size > VOICE_MAX_BYTES) {
      await bestEffortDelete(input.path);
      log.fail({
        step: "validate_media",
        reason: "invalid_media",
        err: new Error("voice exceeds max bytes"),
      });
      return { status: "error", reason: "extraction_failure" };
    }

    const resolvedMime = blob.type || mimeFromPath(input.path);
    if (!canonicalVoiceMime(resolvedMime)) {
      await bestEffortDelete(input.path);
      log.fail({
        step: "validate_media",
        reason: "invalid_media",
        err: new Error(`unsupported mime: ${resolvedMime}`),
      });
      return { status: "error", reason: "extraction_failure" };
    }

    const buffer = new Uint8Array(await blob.arrayBuffer());
    bytes = buffer;
    mimeType = resolvedMime;
  } catch (err) {
    await bestEffortDelete(input.path);
    log.fail({ step: "download", reason: "download_failed", err });
    return { status: "error", reason: "extraction_failure" };
  }

  let text: string;
  try {
    log.breadcrumb("stt");
    const stt = await timed(log, "stt", () =>
      transcribeRecording({ bytes, mimeType }),
    );
    text = stt.text;
  } catch (err) {
    log.fail({ step: "stt", reason: "stt_failed", err });
    await bestEffortDelete(input.path);
    return { status: "error", reason: "extraction_failure" };
  }

  if (!isUsableTranscript(text)) {
    log.fail({
      step: "empty_transcript",
      reason: "empty_transcript",
      err: new Error("STT returned empty or whitespace-only transcript"),
    });
    await bestEffortDelete(input.path);
    return { status: "error", reason: "extraction_failure" };
  }

  try {
    log.breadcrumb("text_extract");
    const raw = await timed(log, "text_extract", () =>
      extractFromVoiceTranscript({
        transcript: text,
        visibleCategories,
      }),
    );

    log.breadcrumb("normalize");
    const t0 = performance.now();
    const normalized = normalizeExtract({
      raw,
      channel: "voice",
      forceExpense: false,
      visibleCategories,
      systemFallbackCategoryId,
    });
    log.setTiming("normalize", performance.now() - t0);

    const draft = draftFromNormalized(normalized, "voice");

    log.success({
      field_presence: fieldPresenceFromDraft(draft),
      models: {
        stt: getSttModel(),
        text_extract: getTextExtractModel(),
      },
    });

    return {
      status: "ok",
      draft,
      categories: visibleCategories satisfies CategoryPickerItem[],
    };
  } catch (err) {
    log.fail({
      step: "text_extract",
      reason: "text_extract_failed",
      err,
    });
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

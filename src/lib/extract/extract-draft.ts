/**
 * Extraction — one deep module for the Receipt/Recording → Draft lifecycle.
 *
 * Public seam: `extractDraft({ path, channel })` runs the whole server-side
 * extract lifecycle for one capture-temp object and returns either an ok Draft
 * + the Category picker list used for mapping, or a typed error reason. Photo
 * (Receipt vision) and voice (Recording STT + text extract) are channel
 * adapters behind this seam; adding a Channel or changing ADR-0005/0007
 * behavior touches this module, not twin orchestrators.
 *
 * Owned here (decision #4): session auth; path ownership check; visible
 * Categories + System fallback load; admin download of the temp object;
 * channel size/MIME validation; channel adapters; normalize → Draft; eager
 * best-effort purge on all terminal paths (ADR-0005); return picker Categories
 * on success.
 *
 * Not owned here (decision #5): signed upload URL creation; cancel/orphan
 * purge from client pipelines — those live in `lib/capture/capture-temp`.
 *
 * Optional dependency overrides let lifecycle tests avoid live LLM/STT and real
 * Storage; production callers pass nothing.
 */

import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Draft } from "@/lib/draft/types";
import {
  CAPTURE_TEMP_BUCKET,
  PHOTO_MAX_BYTES,
  isUserCapturePath,
} from "@/lib/capture/photo-limits";
import { VOICE_MAX_BYTES, canonicalVoiceMime } from "@/lib/capture/voice-limits";
import { bestEffortDeleteStorageObject } from "@/lib/capture/capture-temp";
import { draftFromNormalized, normalizeExtract } from "./normalize-extract";
import type { VisibleCategoryRef } from "./normalize-extract";
import type { ExtractModelOutput } from "./schema";
import { extractReceiptFields, type VisionReceiptInput } from "./vision-receipt";
import {
  isUsableTranscript,
  transcribeRecording,
  type TranscribeRecordingInput,
} from "./stt";
import {
  extractFromVoiceTranscript,
  type VoiceTranscriptExtractInput,
} from "./voice-transcript";

export type ExtractChannel = "photo" | "voice";

export type ExtractionResult =
  | {
      status: "ok";
      draft: Draft;
      /** Picker items match the visible set used for normalize. */
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

/** Downloaded temp media before channel size/MIME validation. */
type DownloadedMedia = { bytes: Uint8Array; mimeType: string };

/** Visible Categories + System fallback id needed for Expense normalize. */
export type CategoryContext =
  | {
      ok: true;
      visibleCategories: VisibleCategoryRef[];
      systemFallbackCategoryId: string;
    }
  | { ok: false };

type SessionResult = { userId: string | null };

/**
 * Optional overrides for the Extraction lifecycle. Production callers omit
 * `deps` entirely; tests inject fakes to avoid live LLM/STT and real Storage.
 */
export type ExtractDraftDeps = {
  /** Session/auth lookup. */
  loadSession?: () => Promise<SessionResult>;
  /** Load visible Categories + System fallback id. */
  loadCategoryContext?: () => Promise<CategoryContext>;
  /** Admin download of the temp object; `null` on miss/error. */
  downloadTempObject?: (path: string) => Promise<DownloadedMedia | null>;
  /** Best-effort purge of the temp object (no auth — ownership is checked). */
  deleteTempObject?: (path: string) => Promise<void>;
  /** Photo channel adapter (Receipt → structured extract). */
  extractReceipt?: (input: VisionReceiptInput) => Promise<ExtractModelOutput>;
  /** Voice channel: STT (Recording → transcript). */
  transcribe?: (input: TranscribeRecordingInput) => Promise<{ text: string }>;
  /** Voice channel: transcript → structured extract. */
  extractTranscript?: (
    input: VoiceTranscriptExtractInput,
  ) => Promise<ExtractModelOutput>;
};

/**
 * Server Extraction lifecycle for one capture-temp object.
 *
 * - unauthenticated → error, no Draft, no purge (object may not be caller's).
 * - path outside user prefix → invalid_path, no purge.
 * - Category context unavailable / missing System fallback → unavailable + purge.
 * - download miss / oversize / bad MIME → extraction_failure + purge.
 * - photo success: forces Expense Draft, returns picker Categories, purges.
 * - voice success: kind from normalized extract (Expense or Income), purges.
 * - unusable transcript / provider throw → extraction_failure + purge.
 * - successful normalize with null Amount → ok Draft (not failure, ADR-0007).
 *
 * Media is best-effort purged on every terminal path after the object is
 * downloaded (ADR-0005). Photo always yields an Expense Draft; voice may
 * propose Expense or Income (ADR-0002).
 */
export async function extractDraft(
  input: { path: string; channel: ExtractChannel },
  deps: ExtractDraftDeps = {},
): Promise<ExtractionResult> {
  const session = await (deps.loadSession ?? defaultLoadSession)();
  if (!session.userId) {
    return { status: "error", reason: "unauthenticated" };
  }

  if (!isUserCapturePath(session.userId, input.path)) {
    return { status: "error", reason: "invalid_path" };
  }

  const ctx = await (deps.loadCategoryContext ?? defaultLoadCategoryContext)();
  if (!ctx.ok) {
    await purgeTemp(input.path, deps);
    return { status: "error", reason: "unavailable" };
  }

  const media = await (deps.downloadTempObject ?? defaultDownloadTempObject)(
    input.path,
  );
  if (!media) {
    await purgeTemp(input.path, deps);
    return { status: "error", reason: "extraction_failure" };
  }

  const sizeCheck = checkChannelMedia(input.channel, media);
  if (!sizeCheck.ok) {
    await purgeTemp(input.path, deps);
    return { status: "error", reason: "extraction_failure" };
  }

  try {
    if (input.channel === "photo") {
      const raw = await (deps.extractReceipt ?? extractReceiptFields)({
        bytes: media.bytes,
        mimeType: media.mimeType,
        visibleCategories: ctx.visibleCategories,
      });

      const normalized = normalizeExtract({
        raw,
        channel: "photo",
        forceExpense: true,
        visibleCategories: ctx.visibleCategories,
        systemFallbackCategoryId: ctx.systemFallbackCategoryId,
      });

      const draft = draftFromNormalized(normalized, "photo");

      return {
        status: "ok",
        draft,
        categories: ctx.visibleCategories satisfies CategoryPickerItem[],
      };
    }

    const { text } = await (deps.transcribe ?? transcribeRecording)({
      bytes: media.bytes,
      mimeType: media.mimeType,
    });
    if (!isUsableTranscript(text)) {
      return { status: "error", reason: "extraction_failure" };
    }

    const raw = await (deps.extractTranscript ?? extractFromVoiceTranscript)({
      transcript: text,
      visibleCategories: ctx.visibleCategories,
    });

    const normalized = normalizeExtract({
      raw,
      channel: "voice",
      forceExpense: false,
      visibleCategories: ctx.visibleCategories,
      systemFallbackCategoryId: ctx.systemFallbackCategoryId,
    });

    const draft = draftFromNormalized(normalized, "voice");

    return {
      status: "ok",
      draft,
      categories: ctx.visibleCategories satisfies CategoryPickerItem[],
    };
  } catch {
    return { status: "error", reason: "extraction_failure" };
  } finally {
    await purgeTemp(input.path, deps);
  }
}

type ChannelMediaCheck = { ok: true } | { ok: false };

/** Channel-specific max bytes + MIME validation (ADR-0005 limits). */
function checkChannelMedia(
  channel: ExtractChannel,
  media: DownloadedMedia,
): ChannelMediaCheck {
  if (channel === "photo") {
    if (media.bytes.byteLength <= 0 || media.bytes.byteLength > PHOTO_MAX_BYTES) {
      return { ok: false };
    }
    // Photo MIME is not rejected server-side here (client compress enforces
    // allowed types pre-upload); preserve existing photo behavior.
    return { ok: true };
  }

  if (media.bytes.byteLength <= 0 || media.bytes.byteLength > VOICE_MAX_BYTES) {
    return { ok: false };
  }
  if (!canonicalVoiceMime(media.mimeType)) {
    return { ok: false };
  }
  return { ok: true };
}

async function purgeTemp(
  path: string,
  deps: ExtractDraftDeps,
): Promise<void> {
  const del = deps.deleteTempObject ?? bestEffortDeleteStorageObject;
  try {
    await del(path);
  } catch {
    // Orphan TTL (1h) is the safety net (ADR-0005).
  }
}

async function defaultLoadSession(): Promise<SessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { userId: user?.id ?? null };
}

async function defaultLoadCategoryContext(): Promise<CategoryContext> {
  const supabase = await createClient();
  const [categoriesResult, fallbackResult] = await Promise.all([
    supabase.from("categories").select(CATEGORY_SELECT).eq("is_hidden", false),
    supabase
      .from("categories")
      .select("id")
      .eq("is_system_fallback", true)
      .maybeSingle(),
  ]);

  if (categoriesResult.error || fallbackResult.error || !fallbackResult.data) {
    return { ok: false };
  }

  const rows = (categoriesResult.data ?? []).map(mapCategoryRow);
  const visibleCategories = sortCategoriesForManage(rows).map((c) => ({
    id: c.id,
    displayName: c.displayName,
  }));

  return {
    ok: true,
    visibleCategories: visibleCategories satisfies CategoryPickerItem[],
    systemFallbackCategoryId: fallbackResult.data.id as string,
  };
}

async function defaultDownloadTempObject(
  path: string,
): Promise<DownloadedMedia | null> {
  try {
    const admin = createAdminClient();
    const { data: blob, error: downloadError } = await admin.storage
      .from(CAPTURE_TEMP_BUCKET)
      .download(path);

    if (downloadError || !blob) {
      return null;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mimeType = blob.type || mimeFromPath(path);
    return { bytes, mimeType };
  } catch {
    return null;
  }
}

/** MIME fallback when the Storage blob reports no content-type. */
function mimeFromPath(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".webm")) return "audio/webm";
  if (path.endsWith(".m4a") || path.endsWith(".mp4")) return "audio/mp4";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".wav")) return "audio/wav";
  if (path.endsWith(".aac")) return "audio/aac";
  return "image/jpeg";
}

/**
 * Bot media intake adapter (ADR-0011):
 * download → temp Storage → extractDraft({ path, channel }) → eager delete (in extract).
 * Forces Expense Draft; caption → Note when empty.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  CAPTURE_TEMP_BUCKET,
  buildPhotoObjectPath,
  type PhotoMime,
} from "@/lib/capture/photo-limits";
import {
  buildVoiceObjectPath,
  type VoiceMime,
} from "@/lib/capture/voice-limits";
import {
  extractDraft,
  type ExtractDraftDeps,
  type ExtractionResult,
} from "@/lib/extract/extract-draft";
import type { Draft } from "@/lib/draft/types";
import { downloadTelegramFile, getFile } from "./bot-api";
import { loadBotCategoryContext } from "./bot-categories";
import {
  applyCaptionNoteIfEmpty,
  forceExpenseDraft,
} from "./draft-postprocess";
import {
  checkDownloadedPhoto,
  checkDownloadedVoice,
  guessPhotoMime,
  guessVoiceMime,
  type BotPreCaptureOk,
} from "./pre-capture";

export type BotMediaPipelineOk = {
  status: "ok";
  draft: Draft;
  systemFallbackCategoryId: string;
};

export type BotMediaPipelineResult =
  | BotMediaPipelineOk
  | {
      status: "pre_capture";
      reason:
        | "download_failed"
        | "type"
        | "size"
        | "upload_failed"
        | "categories_unavailable"
        | "pipeline_error";
    }
  | { status: "extraction_failure" }
  | { status: "cancelled" };

export type BotMediaPipelineDeps = {
  extract?: typeof extractDraft;
  isCancelled?: () => Promise<boolean>;
};

/**
 * Run photo/voice intake for a mapped user after metadata pre-capture passed.
 */
export async function runBotMediaPipeline(input: {
  userId: string;
  preCapture: BotPreCaptureOk;
  caption?: string | null;
  deps?: BotMediaPipelineDeps;
}): Promise<BotMediaPipelineResult> {
  const deps = input.deps ?? {};
  const extract = deps.extract ?? extractDraft;
  const isCancelled = deps.isCancelled ?? (async () => false);

  if (await isCancelled()) return { status: "cancelled" };

  const file = await getFile(input.preCapture.fileId);
  if (!file.ok || !file.result.file_path) {
    return { status: "pre_capture", reason: "download_failed" };
  }

  const downloaded = await downloadTelegramFile(file.result.file_path);
  if (!downloaded.ok) {
    return { status: "pre_capture", reason: "download_failed" };
  }

  if (await isCancelled()) return { status: "cancelled" };

  const bytes = new Uint8Array(downloaded.bytes);
  const sizeBytes = bytes.byteLength;

  let channel: "photo" | "voice";
  let path: string;
  let contentType: string;

  if (input.preCapture.channel === "photo") {
    channel = "photo";
    const mimeGuess = guessPhotoMime(file.result.file_path, null);
    const meta = checkDownloadedPhoto({ sizeBytes, mimeType: mimeGuess });
    if (!meta.ok) {
      return { status: "pre_capture", reason: meta.reason };
    }
    path = buildPhotoObjectPath(input.userId, meta.mime as PhotoMime);
    contentType = meta.mime;
  } else {
    channel = "voice";
    const mimeGuess = guessVoiceMime(
      file.result.file_path,
      input.preCapture.mimeType,
      null,
    );
    const meta = checkDownloadedVoice({ sizeBytes, mimeType: mimeGuess });
    if (!meta.ok) {
      return { status: "pre_capture", reason: meta.reason };
    }
    path = buildVoiceObjectPath(input.userId, meta.mime as VoiceMime);
    contentType = meta.mime;
  }

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(CAPTURE_TEMP_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return { status: "pre_capture", reason: "upload_failed" };
  }

  if (await isCancelled()) {
    try {
      await admin.storage.from(CAPTURE_TEMP_BUCKET).remove([path]);
    } catch {
      // TTL safety net (ADR-0005)
    }
    return { status: "cancelled" };
  }

  const extractDeps: ExtractDraftDeps = {
    loadSession: async () => ({ userId: input.userId }),
    loadCategoryContext: async () => loadBotCategoryContext(input.userId),
  };

  const extracted: ExtractionResult = await extract(
    { path, channel },
    extractDeps,
  );

  if (await isCancelled()) {
    return { status: "cancelled" };
  }

  if (extracted.status !== "ok") {
    if (extracted.reason === "extraction_failure") {
      return { status: "extraction_failure" };
    }
    // unavailable → categories/context; other early errors → generic pre-capture
    if (extracted.reason === "unavailable") {
      return { status: "pre_capture", reason: "categories_unavailable" };
    }
    return { status: "pre_capture", reason: "pipeline_error" };
  }

  const ctx = await loadBotCategoryContext(input.userId);
  if (!ctx.ok) {
    return { status: "pre_capture", reason: "categories_unavailable" };
  }

  let draft = forceExpenseDraft(
    extracted.draft,
    ctx.systemFallbackCategoryId,
  );
  if (channel === "photo") {
    draft = applyCaptionNoteIfEmpty(draft, input.caption);
  }
  draft = { ...draft, channel, kind: "expense" };

  return {
    status: "ok",
    draft,
    systemFallbackCategoryId: ctx.systemFallbackCategoryId,
  };
}

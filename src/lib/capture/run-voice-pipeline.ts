import { deleteCaptureTempObject } from "@/app/(app)/capture/photo-actions";
import {
  createVoiceUpload,
  extractVoiceDraft,
  type ExtractVoiceDraftResult,
} from "@/app/(app)/capture/voice-actions";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Draft } from "@/lib/draft/types";
import { createClient } from "@/lib/supabase/client";
import type { VoicePreCaptureReason } from "./messages";
import {
  CAPTURE_TEMP_BUCKET,
  checkVoiceFileMeta,
  type VoiceMime,
} from "./voice-limits";

export type VoicePipelineOk = {
  status: "ok";
  draft: Draft;
  categories: CategoryPickerItem[];
};

export type VoicePipelineResult =
  | VoicePipelineOk
  | { status: "pre-capture"; reason: VoicePreCaptureReason }
  | { status: "extraction_failure" }
  | { status: "cancelled" };

export type VoicePipelineDeps = {
  createUpload?: typeof createVoiceUpload;
  extract?: typeof extractVoiceDraft;
  deleteTemp?: typeof deleteCaptureTempObject;
  uploadBlob?: (
    path: string,
    token: string,
    blob: Blob,
    contentType: string,
  ) => Promise<{ error: Error | null }>;
  isOnline?: () => boolean;
  checkMeta?: typeof checkVoiceFileMeta;
};

/**
 * Client voice pipeline: validate blob → signed upload → extract → drop Blob.
 * Cancel: abort without Draft; best-effort delete if object already uploaded.
 * Media is not retained after the extract attempt (ADR-0005).
 */
export async function runVoicePipeline(
  blob: Blob,
  options: {
    signal?: AbortSignal;
    deps?: VoicePipelineDeps;
    /** Override MIME when Blob.type is empty. */
    mimeType?: string;
  } = {},
): Promise<VoicePipelineResult> {
  const deps = options.deps ?? {};
  const createUpload = deps.createUpload ?? createVoiceUpload;
  const extract = deps.extract ?? extractVoiceDraft;
  const deleteTemp = deps.deleteTemp ?? deleteCaptureTempObject;
  const isOnline = deps.isOnline ?? (() => navigator.onLine);
  const uploadBlob = deps.uploadBlob ?? defaultUpload;
  const checkMeta = deps.checkMeta ?? checkVoiceFileMeta;

  let uploadedPath: string | null = null;

  const finishCancelled = async (): Promise<VoicePipelineResult> => {
    if (uploadedPath) {
      try {
        await deleteTemp({ path: uploadedPath });
      } catch {
        // TTL safety net
      }
    }
    return { status: "cancelled" };
  };

  if (options.signal?.aborted) {
    return { status: "cancelled" };
  }

  if (!isOnline()) {
    return { status: "pre-capture", reason: "offline" };
  }

  const mimeType = options.mimeType || blob.type || "audio/webm";
  const meta = checkMeta({ mimeType, sizeBytes: blob.size });
  if (!meta.ok) {
    return { status: "pre-capture", reason: meta.reason };
  }

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  const uploadSlot = await createUpload({ contentType: meta.mime });
  if (uploadSlot.status !== "ok") {
    if (uploadSlot.reason === "type") {
      return { status: "pre-capture", reason: "type" };
    }
    return { status: "pre-capture", reason: "unavailable" };
  }

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  const { error: uploadError } = await uploadBlob(
    uploadSlot.path,
    uploadSlot.token,
    blob,
    meta.mime as VoiceMime,
  );

  // Recording bytes leave scope after this function returns (ADR-0005).
  uploadedPath = uploadSlot.path;

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  if (uploadError) {
    await deleteTemp({ path: uploadSlot.path }).catch(() => undefined);
    return { status: "extraction_failure" };
  }

  let extractResult: ExtractVoiceDraftResult;
  try {
    extractResult = await extract({ path: uploadSlot.path });
  } catch {
    await deleteTemp({ path: uploadSlot.path }).catch(() => undefined);
    return { status: "extraction_failure" };
  }

  // Extract path already deletes Storage object; clear local tracking.
  uploadedPath = null;

  if (options.signal?.aborted) {
    return { status: "cancelled" };
  }

  if (extractResult.status === "ok") {
    return {
      status: "ok",
      draft: extractResult.draft,
      categories: extractResult.categories,
    };
  }

  return { status: "extraction_failure" };
}

async function defaultUpload(
  path: string,
  token: string,
  blob: Blob,
  contentType: string,
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(CAPTURE_TEMP_BUCKET)
    .uploadToSignedUrl(path, token, blob, {
      contentType,
      upsert: false,
    });
  return { error: error ? new Error(error.message) : null };
}

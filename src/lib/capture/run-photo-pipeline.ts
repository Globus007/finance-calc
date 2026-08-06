import {
  createPhotoUpload,
  deleteCaptureTempObject,
  extractPhotoDraft,
  type ExtractPhotoDraftResult,
} from "@/app/(app)/capture/photo-actions";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Draft } from "@/lib/draft/types";
import { createClient } from "@/lib/supabase/client";
import { compressReceiptImage } from "./compress-image";
import { isCaptureOnline } from "./constraints";
import type { PhotoPreCaptureReason } from "./messages";
import { CAPTURE_TEMP_BUCKET } from "./photo-limits";

export type PhotoPipelineOk = {
  status: "ok";
  draft: Draft;
  categories: CategoryPickerItem[];
};

export type PhotoPipelineResult =
  | PhotoPipelineOk
  | { status: "pre-capture"; reason: PhotoPreCaptureReason }
  | { status: "extraction_failure" }
  | { status: "cancelled" };

export type PhotoPipelineDeps = {
  compress?: typeof compressReceiptImage;
  createUpload?: typeof createPhotoUpload;
  extract?: typeof extractPhotoDraft;
  deleteTemp?: typeof deleteCaptureTempObject;
  uploadBlob?: (
    path: string,
    token: string,
    blob: Blob,
    contentType: string,
  ) => Promise<{ error: Error | null }>;
  isOnline?: () => boolean;
};

/**
 * Client photo pipeline: compress → signed upload → extract → drop Blob.
 * Cancel: abort without Draft; best-effort delete if object already uploaded.
 */
export async function runPhotoPipeline(
  file: File,
  options: {
    signal?: AbortSignal;
    deps?: PhotoPipelineDeps;
  } = {},
): Promise<PhotoPipelineResult> {
  const deps = options.deps ?? {};
  const compress = deps.compress ?? compressReceiptImage;
  const createUpload = deps.createUpload ?? createPhotoUpload;
  const extract = deps.extract ?? extractPhotoDraft;
  const deleteTemp = deps.deleteTemp ?? deleteCaptureTempObject;
  const isOnline = deps.isOnline ?? (() => isCaptureOnline());
  const uploadBlob = deps.uploadBlob ?? defaultUpload;

  let uploadedPath: string | null = null;

  const finishCancelled = async (): Promise<PhotoPipelineResult> => {
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

  const compressed = await compress(file);
  if (!compressed.ok) {
    if (compressed.reason === "type") {
      return { status: "pre-capture", reason: "type" };
    }
    if (compressed.reason === "size") {
      return { status: "pre-capture", reason: "size" };
    }
    return { status: "pre-capture", reason: "unavailable" };
  }

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  const uploadSlot = await createUpload({ contentType: compressed.mime });
  if (uploadSlot.status !== "ok") {
    return { status: "pre-capture", reason: "unavailable" };
  }

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  const { error: uploadError } = await uploadBlob(
    uploadSlot.path,
    uploadSlot.token,
    compressed.blob,
    compressed.mime,
  );

  // Receipt bytes leave scope after this function returns (ADR-0005).
  uploadedPath = uploadSlot.path;

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  if (uploadError) {
    await deleteTemp({ path: uploadSlot.path }).catch(() => undefined);
    return { status: "extraction_failure" };
  }

  let extractResult: ExtractPhotoDraftResult;
  try {
    extractResult = await extract({ path: uploadSlot.path });
  } catch {
    // Extract may never have run (network/throw); drop temp object client-side.
    await deleteTemp({ path: uploadSlot.path }).catch(() => undefined);
    return { status: "extraction_failure" };
  }

  // Extract's server path deletes on success and extraction_failure, but NOT
  // on unauthenticated / invalid_path (returns before its purge). Don't clear
  // uploadedPath here so finishCancelled / the non-ok branch can still purge.

  if (options.signal?.aborted) {
    return finishCancelled();
  }

  if (extractResult.status === "ok") {
    return {
      status: "ok",
      draft: extractResult.draft,
      categories: extractResult.categories,
    };
  }

  // Non-ok extract may have left the temp object in Storage (ADR-0005):
  // unauthenticated/invalid_path return before server-side deletion, so purge
  // explicitly here.
  await deleteTemp({ path: uploadSlot.path }).catch(() => undefined);
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

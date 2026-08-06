"use server";

import {
  createVoiceUpload as createVoiceUploadImpl,
  deleteCaptureTempObject as deleteCaptureTempObjectImpl,
  type CreateVoiceUploadResult,
  type DeleteCaptureTempObjectResult,
} from "@/lib/capture/capture-temp";
import {
  extractDraft,
  type ExtractionResult,
} from "@/lib/extract/extract-draft";

export type {
  CreateVoiceUploadResult,
  DeleteCaptureTempObjectResult,
};
export type ExtractVoiceDraftResult = ExtractionResult;

/**
 * Short-lived signed upload for a Recording (thin `"use server"` wrapper
 * around the capture-temp helper, ADR-0005).
 */
export async function createVoiceUpload(input: {
  contentType: string;
}): Promise<CreateVoiceUploadResult> {
  return createVoiceUploadImpl(input);
}

/**
 * Voice Recording → Expense or Income Draft. Thin delegate to the Extraction
 * module; voice may propose either kind (ADR-0002). After path ownership is
 * established, media is best-effort purged on terminal extract paths (ADR-0005);
 * unauthenticated / invalid_path return before purge.
 */
export async function extractVoiceDraft(input: {
  path: string;
}): Promise<ExtractionResult> {
  return extractDraft({ path: input.path, channel: "voice" });
}

/**
 * Best-effort delete of a capture-temp object (cancel after upload, purge
 * after a non-ok extract, orphan when session expired mid-pipeline).
 * Re-exported here so the voice pipeline no longer depends on the photo action
 * module for delete-temp (issue #40, decision #14).
 */
export async function deleteCaptureTempObject(input: {
  path: string;
}): Promise<DeleteCaptureTempObjectResult> {
  return deleteCaptureTempObjectImpl(input);
}

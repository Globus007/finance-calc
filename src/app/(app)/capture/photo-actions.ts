"use server";

import {
  createPhotoUpload as createPhotoUploadImpl,
  deleteCaptureTempObject as deleteCaptureTempObjectImpl,
  type CreatePhotoUploadResult,
  type DeleteCaptureTempObjectResult,
} from "@/lib/capture/capture-temp";
import {
  extractDraft,
  type ExtractionResult,
} from "@/lib/extract/extract-draft";

export type {
  CreatePhotoUploadResult,
  DeleteCaptureTempObjectResult,
};
export type ExtractPhotoDraftResult = ExtractionResult;

/**
 * Short-lived signed upload for a Receipt (thin `"use server"` wrapper around
 * the capture-temp helper, ADR-0005).
 */
export async function createPhotoUpload(input: {
  contentType: string;
}): Promise<CreatePhotoUploadResult> {
  return createPhotoUploadImpl(input);
}

/**
 * Photo Receipt → Expense Draft. Thin delegate to the Extraction module;
 * photo forces Expense (ADR-0002/0007). After path ownership is established,
 * media is best-effort purged on terminal extract paths (ADR-0005); unauthenticated
 * / invalid_path return before purge.
 */
export async function extractPhotoDraft(input: {
  path: string;
}): Promise<ExtractionResult> {
  return extractDraft({ path: input.path, channel: "photo" });
}

/**
 * Best-effort delete of a capture-temp object (cancel after upload, purge
 * after a non-ok extract, orphan when session expired mid-pipeline).
 */
export async function deleteCaptureTempObject(input: {
  path: string;
}): Promise<DeleteCaptureTempObjectResult> {
  return deleteCaptureTempObjectImpl(input);
}

import { z } from "zod";

/**
 * Unified LLM extract object (ADR-0007).
 * Photo pipeline forces expense after the model returns.
 * Voice may propose expense or income.
 */
export const extractModelSchema = z.object({
  record_kind: z.enum(["expense", "income"]).nullable().optional(),
  amount: z.number().nullable(),
  occurred_on: z.string().nullable(),
  category_id: z.string().nullable(),
  note: z.string().nullable(),
});

export type ExtractModelOutput = z.infer<typeof extractModelSchema>;

/** Default vision model via AI Gateway (issue #10 / #27). */
export const FALLBACK_VISION_MODEL = "google/gemini-2.5-flash-lite";

/** Swappable via VISION_MODEL env (read at call time for Next.js). */
export function getVisionModel(): string {
  return process.env.VISION_MODEL?.trim() || FALLBACK_VISION_MODEL;
}

/** Default STT model via AI Gateway (issue #9 / #28). */
export const FALLBACK_STT_MODEL = "openai/gpt-4o-mini-transcribe";

/** Swappable via STT_MODEL env. */
export function getSttModel(): string {
  return process.env.STT_MODEL?.trim() || FALLBACK_STT_MODEL;
}

/**
 * Default text LLM for post-STT structured extract (same schema as vision).
 * Cheap flash-lite is enough for short Russian utterances.
 */
export const FALLBACK_TEXT_EXTRACT_MODEL = "google/gemini-2.5-flash-lite";

/** Swappable via TEXT_EXTRACT_MODEL env. */
export function getTextExtractModel(): string {
  return process.env.TEXT_EXTRACT_MODEL?.trim() || FALLBACK_TEXT_EXTRACT_MODEL;
}
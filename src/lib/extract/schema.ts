import { z } from "zod";

/**
 * Unified LLM extract object (ADR-0007).
 * Photo pipeline forces expense after the model returns.
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
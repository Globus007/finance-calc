import { generateText, Output } from "ai";
import type { VisibleCategoryRef } from "./normalize-extract";
import {
  extractModelSchema,
  getTextExtractModel,
  type ExtractModelOutput,
} from "./schema";

export type VoiceTranscriptExtractInput = {
  transcript: string;
  visibleCategories: VisibleCategoryRef[];
  /** Override for tests / env. */
  model?: string;
};

/**
 * Text structured extract from an STT transcript (ADR-0007).
 * Unified schema with photo path; voice may propose expense or income.
 * Multi-mention → primary (first / most complete) record only.
 */
export async function extractFromVoiceTranscript(
  input: VoiceTranscriptExtractInput,
): Promise<ExtractModelOutput> {
  const model = input.model ?? getTextExtractModel();
  const categoryList = input.visibleCategories
    .map((c) => `- ${c.id}: ${c.displayName}`)
    .join("\n");

  const { output } = await generateText({
    model,
    output: Output.object({ schema: extractModelSchema }),
    messages: [
      {
        role: "user",
        content: buildVoiceExtractPrompt(input.transcript, categoryList),
      },
    ],
  });

  if (!output) {
    throw new Error("Voice extract returned empty output");
  }
  return output;
}

function buildVoiceExtractPrompt(
  transcript: string,
  categoryList: string,
): string {
  return [
    "Ты извлекаешь поля одной финансовой записи из русской голосовой расшифровки (Беларусь, BYN).",
    "Верни строго JSON по схеме.",
    "",
    "Правила:",
    "- record_kind: expense (расход/трата/купил) или income (доход/получил/зарплата/кэшбэк).",
    "- Если неясно — expense.",
    "- amount — число BYN одной основной суммы, или null. Не выдумывай.",
    "- Если в фразе несколько сумм/событий — возьми primary: первое или самое полное.",
    "- occurred_on: дата YYYY-MM-DD если явно сказана, иначе null.",
    "- category_id: только id из списка видимых категорий ниже, или null (для income всегда null).",
    "- note: краткий контекст (магазин, источник дохода) или null.",
    "- Предпочитай null вместо догадок.",
    "",
    "Видимые категории (id: название) — только для expense:",
    categoryList || "(нет — category_id всегда null)",
    "",
    "Расшифровка:",
    transcript,
  ].join("\n");
}

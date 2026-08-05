import { generateText, Output } from "ai";
import type { VisibleCategoryRef } from "./normalize-extract";
import { extractModelSchema, getVisionModel } from "./schema";
import type { ExtractModelOutput } from "./schema";

export type VisionReceiptInput = {
  /** Raw image bytes. */
  bytes: Uint8Array;
  mimeType: string;
  visibleCategories: VisibleCategoryRef[];
  /** Override for tests. */
  model?: string;
};

/**
 * Vision structured extract for one Receipt (ADR-0007).
 * Model default: google/gemini-2.5-flash-lite via AI Gateway.
 */
export async function extractReceiptFields(
  input: VisionReceiptInput,
): Promise<ExtractModelOutput> {
  const model = input.model ?? getVisionModel();
  const categoryList = input.visibleCategories
    .map((c) => `- ${c.id}: ${c.displayName}`)
    .join("\n");

  const { output } = await generateText({
    model,
    output: Output.object({ schema: extractModelSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildReceiptPrompt(categoryList),
          },
          {
            type: "file",
            mediaType: input.mimeType.startsWith("image/")
              ? input.mimeType
              : "image/jpeg",
            data: input.bytes,
          },
        ],
      },
    ],
  });

  if (!output) {
    throw new Error("Vision extract returned empty output");
  }
  return output;
}

function buildReceiptPrompt(categoryList: string): string {
  return [
    "Ты извлекаешь поля одного расхода с фото чека (Беларусь/РФ, BYN).",
    "Верни строго JSON по схеме.",
    "",
    "Правила:",
    "- record_kind всегда expense для чека.",
    "- amount — итоговая сумма к оплате (grand total), не позиции. Число BYN или null.",
    "- Если валюта явно не BYN/руб. и конвертация неизвестна — amount: null.",
    "- occurred_on: дата чека YYYY-MM-DD или null (не выдумывай).",
    "- category_id: только id из списка видимых категорий ниже, или null.",
    "- note: магазин/контекст или null. Не выдумывай.",
    "- Предпочитай null вместо догадок.",
    "",
    "Видимые категории (id: название):",
    categoryList || "(нет — category_id всегда null)",
  ].join("\n");
}

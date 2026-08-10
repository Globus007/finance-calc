/**
 * In-chat draft card text + keyboards (ADR-0010 Expense-only).
 */

import type { Draft } from "@/lib/draft/types";
import { formatByn, formatShortDate } from "@/lib/money/format";
import { parseAmount } from "@/lib/draft/parse-amount";
import type { InlineKeyboardMarkup } from "./bot-api";
import { CB_OPEN_CATEGORY } from "./category-keyboard";

/** Short callback_data codes (≤64 bytes). */
export const CB_COMMIT = "c";
export const CB_DISCARD = "d";
export const CB_EDIT_AMOUNT = "a";
export const CB_EDIT_OCCURRED_ON = "o";
export const CB_EDIT_NOTE = "n";
export const CB_CANCEL_EXTRACT = "x";

export function formatDraftCardText(input: {
  draft: Draft;
  categoryName: string;
  footer?: string;
}): string {
  const { draft, categoryName, footer } = input;
  const amountNum = parseAmount(draft.amount);
  const amountLine =
    amountNum !== null
      ? formatByn(amountNum)
      : `${draft.amount || "—"} (проверьте)`;

  const channelLabel = draft.channel === "voice" ? "голос" : "фото";
  const lines = [
    `Черновик · Расход · ${channelLabel}`,
    "",
    `Сумма: ${amountLine}`,
    `Дата: ${formatShortDate(draft.occurredOn)} (${draft.occurredOn})`,
    `Категория: ${categoryName}`,
  ];

  if (draft.note.trim()) {
    lines.push(`Заметка: ${draft.note.trim()}`);
  }
  if (footer) {
    lines.push("", footer);
  }
  return lines.join("\n");
}

export function draftCardKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Записать", callback_data: CB_COMMIT },
        { text: "🗑 Отбросить", callback_data: CB_DISCARD },
      ],
      [
        { text: "✏️ Сумма", callback_data: CB_EDIT_AMOUNT },
        { text: "📅 Дата", callback_data: CB_EDIT_OCCURRED_ON },
      ],
      [
        { text: "🏷 Категория", callback_data: CB_OPEN_CATEGORY },
        { text: "📝 Заметка", callback_data: CB_EDIT_NOTE },
      ],
    ],
  };
}

export function extractProgressKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "⏹ Отмена", callback_data: CB_CANCEL_EXTRACT }],
    ],
  };
}

export function emptyKeyboard(): InlineKeyboardMarkup {
  return { inline_keyboard: [] };
}

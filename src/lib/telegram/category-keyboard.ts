/**
 * Paginated visible Category inline keyboard (ADR-0010).
 * callback_data uses short server-side indices — never raw UUIDs.
 */

import type { InlineKeyboardMarkup } from "./bot-api";

/** Categories per page (two columns × rows; keep under Telegram UI comfort). */
export const CATEGORY_PAGE_SIZE = 6;

/** Open category picker (optional page). */
export const CB_OPEN_CATEGORY = "g";
/** Prefix + page number: `gp:1` */
export const CB_CATEGORY_PAGE_PREFIX = "gp:";
/** Prefix + absolute index in sorted visible list: `G:12` */
export const CB_CATEGORY_PICK_PREFIX = "G:";
/** Back from category list to draft card. */
export const CB_CATEGORY_BACK = "gb";

export type CategoryButtonItem = {
  id: string;
  displayName: string;
};

export function encodeCategoryPage(page: number): string {
  return `${CB_CATEGORY_PAGE_PREFIX}${page}`;
}

export function encodeCategoryPick(index: number): string {
  return `${CB_CATEGORY_PICK_PREFIX}${index}`;
}

export function parseCategoryPage(data: string): number | null {
  if (!data.startsWith(CB_CATEGORY_PAGE_PREFIX)) return null;
  const n = Number(data.slice(CB_CATEGORY_PAGE_PREFIX.length));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function parseCategoryPick(data: string): number | null {
  if (!data.startsWith(CB_CATEGORY_PICK_PREFIX)) return null;
  const n = Number(data.slice(CB_CATEGORY_PICK_PREFIX.length));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Build paginated category keyboard. Indices are absolute in `categories`.
 */
export function categoryPickerKeyboard(input: {
  categories: readonly CategoryButtonItem[];
  page: number;
}): InlineKeyboardMarkup {
  const { categories } = input;
  const pageCount = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE));
  const page = Math.min(Math.max(0, input.page), pageCount - 1);
  const start = page * CATEGORY_PAGE_SIZE;
  const slice = categories.slice(start, start + CATEGORY_PAGE_SIZE);

  const rows: InlineKeyboardMarkup["inline_keyboard"] = [];
  for (let i = 0; i < slice.length; i += 2) {
    const left = slice[i]!;
    const leftIndex = start + i;
    const row = [
      {
        text: left.displayName.slice(0, 32),
        callback_data: encodeCategoryPick(leftIndex),
      },
    ];
    const right = slice[i + 1];
    if (right) {
      row.push({
        text: right.displayName.slice(0, 32),
        callback_data: encodeCategoryPick(start + i + 1),
      });
    }
    rows.push(row);
  }

  const nav: { text: string; callback_data: string }[] = [];
  if (page > 0) {
    nav.push({
      text: "« Назад",
      callback_data: encodeCategoryPage(page - 1),
    });
  }
  if (page < pageCount - 1) {
    nav.push({
      text: "Ещё »",
      callback_data: encodeCategoryPage(page + 1),
    });
  }
  if (nav.length) rows.push(nav);

  rows.push([{ text: "↩ К черновику", callback_data: CB_CATEGORY_BACK }]);

  return { inline_keyboard: rows };
}

export function resolveCategoryByIndex(
  categories: readonly CategoryButtonItem[],
  index: number,
): CategoryButtonItem | null {
  if (index < 0 || index >= categories.length) return null;
  return categories[index] ?? null;
}

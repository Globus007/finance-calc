import type { CategoryRow } from "./types";

/**
 * Manage/picker order per ADR-0001:
 * seed Categories in fixed sort_order, then user-defined A–Я.
 */
export function sortCategoriesForManage<T extends CategoryRow>(
  categories: readonly T[],
): T[] {
  return [...categories].sort((a, b) => {
    if (a.origin !== b.origin) {
      return a.origin === "seed" ? -1 : 1;
    }
    if (a.origin === "seed") {
      return a.sortOrder - b.sortOrder;
    }
    return a.displayName.localeCompare(b.displayName, "ru");
  });
}

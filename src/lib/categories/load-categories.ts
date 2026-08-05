import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
  type CategoryDbRow,
} from "./map-row";
import { sortCategoriesForManage } from "./sort-categories";
import type { CategoryListItem } from "./types";

/**
 * Loads the signed-in user's Categories with usage flags for manage UI.
 * Ordered: seed sort_order, then user-defined A–Я.
 */
export async function loadCategoriesForManage(): Promise<CategoryListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT);

  if (error || !rows) return [];

  const categories = sortCategoriesForManage(
    (rows as CategoryDbRow[]).map(mapCategoryRow),
  );

  const { data: expenseRows, error: expenseError } = await supabase
    .from("expenses")
    .select("category_id");

  // Fail closed: if usage cannot be loaded, treat as in-use so hard-delete
  // is not offered until the server can confirm the Category is unused.
  if (expenseError) {
    return categories.map((c) => ({
      ...c,
      isInUse: true,
    }));
  }

  const inUse = new Set(
    (expenseRows ?? []).map((r) => r.category_id as string),
  );

  return categories.map((c) => ({
    ...c,
    isInUse: inUse.has(c.id),
  }));
}

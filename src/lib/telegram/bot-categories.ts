/**
 * Load visible Categories for a mapped bot user (service role; RLS bypassed).
 */

import {
  CATEGORY_SELECT,
  mapCategoryRow,
  type CategoryDbRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CategoryButtonItem } from "./category-keyboard";
import type { CategoryContext } from "@/lib/extract/extract-draft";

export async function loadVisibleCategoriesForUser(
  userId: string,
): Promise<CategoryButtonItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("owner_id", userId)
    .eq("is_hidden", false);

  if (error || !data) return [];

  const rows = (data as CategoryDbRow[]).map(mapCategoryRow);
  return sortCategoriesForManage(rows).map((c) => ({
    id: c.id,
    displayName: c.displayName,
  }));
}

/** Category context for extractDraft deps (admin, scoped to owner). */
export async function loadBotCategoryContext(
  userId: string,
): Promise<CategoryContext> {
  const admin = createAdminClient();
  const [categoriesResult, fallbackResult] = await Promise.all([
    admin
      .from("categories")
      .select(CATEGORY_SELECT)
      .eq("owner_id", userId)
      .eq("is_hidden", false),
    admin
      .from("categories")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_system_fallback", true)
      .maybeSingle(),
  ]);

  if (categoriesResult.error || fallbackResult.error || !fallbackResult.data) {
    return { ok: false };
  }

  const rows = (categoriesResult.data as CategoryDbRow[]).map(mapCategoryRow);
  const visibleCategories = sortCategoriesForManage(rows).map((c) => ({
    id: c.id,
    displayName: c.displayName,
  }));

  return {
    ok: true,
    visibleCategories,
    systemFallbackCategoryId: fallbackResult.data.id as string,
  };
}

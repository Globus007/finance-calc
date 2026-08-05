import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { categoryCapabilities } from "./lifecycle";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
  type CategoryDbRow,
} from "./map-row";
import { sortCategoriesForManage } from "./sort-categories";
import type { CategoryManageItem } from "./types";

/**
 * Loads the signed-in user's Categories with usage flags and action caps
 * for the manage UI. Ordered: seed sort_order, then user-defined A–Я.
 *
 * Parallel fetches (async-parallel); React.cache for per-request dedupe
 * (server-cache-react); strips unused DB fields before RSC boundary
 * (server-serialization).
 */
export const loadCategoriesForManage = cache(
  async (): Promise<CategoryManageItem[]> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Independent reads — run concurrently after auth.
    const [categoriesResult, expensesResult] = await Promise.all([
      supabase.from("categories").select(CATEGORY_SELECT),
      supabase.from("expenses").select("category_id"),
    ]);

    if (categoriesResult.error || !categoriesResult.data) return [];

    const categories = sortCategoriesForManage(
      (categoriesResult.data as CategoryDbRow[]).map(mapCategoryRow),
    );

    // Fail closed: if usage cannot be loaded, treat as in-use so hard-delete
    // is not offered until the server can confirm the Category is unused.
    const inUse = expensesResult.error
      ? null
      : new Set(
          (expensesResult.data ?? []).map((r) => r.category_id as string),
        );

    return categories.map((c) => {
      const isInUse = inUse === null ? true : inUse.has(c.id);
      const caps = categoryCapabilities(c, { isInUse });
      return {
        id: c.id,
        displayName: c.displayName,
        origin: c.origin,
        isSystemFallback: c.isSystemFallback,
        isHidden: c.isHidden,
        isInUse,
        canHide: caps.canHide,
        canUnhide: caps.canUnhide,
        canRename: caps.canRename,
        canDelete: caps.canDelete,
      };
    });
  },
);

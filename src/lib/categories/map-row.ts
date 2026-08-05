import type { CategoryRow } from "./types";

/** Supabase `categories` row (snake_case). */
export type CategoryDbRow = {
  id: string;
  display_name: string;
  origin: "seed" | "user";
  is_system_fallback: boolean;
  is_hidden: boolean;
  sort_order: number;
  seed_key: string | null;
};

/** Shared select list for manage loaders and mutations. */
export const CATEGORY_SELECT =
  "id, display_name, origin, is_system_fallback, is_hidden, sort_order, seed_key" as const;

export function mapCategoryRow(row: CategoryDbRow): CategoryRow {
  return {
    id: row.id,
    displayName: row.display_name,
    origin: row.origin,
    isSystemFallback: row.is_system_fallback,
    isHidden: row.is_hidden,
    sortOrder: row.sort_order,
    seedKey: row.seed_key,
  };
}

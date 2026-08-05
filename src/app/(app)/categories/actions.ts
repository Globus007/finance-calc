"use server";

import { revalidatePath } from "next/cache";
import {
  mapCategoryRow,
  normalizeDisplayName,
  validateCategoryMutation,
  type CategoryRow,
  type MutationRejection,
} from "@/lib/categories";
import { CATEGORY_SELECT } from "@/lib/categories/map-row";
import { createClient } from "@/lib/supabase/server";

export type CategoryActionResult =
  | { status: "ok" }
  | {
      status: "error";
      reason:
        | MutationRejection
        | "unauthenticated"
        | "not_found"
        | "unavailable";
    };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null as null };
  }
  return { supabase, user };
}

async function loadCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCategoryRow(data);
}

async function loadExistingNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string; displayName: string }[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, display_name");
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    displayName: row.display_name as string,
  }));
}

async function isCategoryInUse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (error) return true; // fail closed for delete
  return (count ?? 0) > 0;
}

function revalidateCategories() {
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function createCategory(
  displayName: string,
): Promise<CategoryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const existing = await loadExistingNames(supabase);
  const check = validateCategoryMutation(
    null,
    { type: "create", displayName },
    { existing },
  );
  if (!check.ok) return { status: "error", reason: check.reason };

  const name = normalizeDisplayName(displayName);
  const { error } = await supabase.from("categories").insert({
    owner_id: user.id,
    display_name: name,
    origin: "user",
    is_system_fallback: false,
    is_hidden: false,
    sort_order: 0,
    seed_key: null,
  });

  if (error) {
    if (error.code === "23505") {
      return { status: "error", reason: "duplicate_name" };
    }
    return { status: "error", reason: "unavailable" };
  }

  revalidateCategories();
  return { status: "ok" };
}

export async function renameCategory(
  id: string,
  displayName: string,
): Promise<CategoryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const category = await loadCategory(supabase, id);
  if (!category) return { status: "error", reason: "not_found" };

  const existing = await loadExistingNames(supabase);
  const check = validateCategoryMutation(
    category,
    { type: "rename", displayName },
    { existing },
  );
  if (!check.ok) return { status: "error", reason: check.reason };

  const name = normalizeDisplayName(displayName);
  const { error } = await supabase
    .from("categories")
    .update({ display_name: name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { status: "error", reason: "duplicate_name" };
    }
    return { status: "error", reason: "unavailable" };
  }

  revalidateCategories();
  return { status: "ok" };
}

export async function setCategoryHidden(
  id: string,
  isHidden: boolean,
): Promise<CategoryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const category = await loadCategory(supabase, id);
  if (!category) return { status: "error", reason: "not_found" };

  const check = validateCategoryMutation(category, {
    type: isHidden ? "hide" : "unhide",
  });
  if (!check.ok) return { status: "error", reason: check.reason };

  const { error } = await supabase
    .from("categories")
    .update({ is_hidden: isHidden })
    .eq("id", id);

  if (error) return { status: "error", reason: "unavailable" };

  revalidateCategories();
  return { status: "ok" };
}

export async function deleteCategory(
  id: string,
): Promise<CategoryActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const category = await loadCategory(supabase, id);
  if (!category) return { status: "error", reason: "not_found" };

  const isInUse = await isCategoryInUse(supabase, id);
  const check = validateCategoryMutation(
    category,
    { type: "delete" },
    { isInUse },
  );
  if (!check.ok) return { status: "error", reason: check.reason };

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    // FK RESTRICT when Expense still references the Category
    if (error.code === "23503") {
      return { status: "error", reason: "in_use" };
    }
    return { status: "error", reason: "unavailable" };
  }

  revalidateCategories();
  return { status: "ok" };
}

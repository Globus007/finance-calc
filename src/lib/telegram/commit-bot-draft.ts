/**
 * Commit Expense from bot Draft via service role (same expenses table as PWA).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Draft } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";

export type BotCommitResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: string };

/**
 * Persist a confirmed bot Draft as the mapped user.
 * Channel must be photo | voice (bot never commits manual).
 */
export async function commitBotDraft(input: {
  userId: string;
  draft: Draft;
}): Promise<BotCommitResult> {
  const validation = validateCommit(input.draft);
  if (!validation.ok) {
    return { status: "error", reason: validation.reason };
  }

  if (input.draft.kind !== "expense") {
    return { status: "error", reason: "kind_not_supported" };
  }

  const channel = input.draft.channel;
  if (channel !== "photo" && channel !== "voice") {
    return { status: "error", reason: "invalid_channel" };
  }

  const categoryId = validation.categoryId as string;
  const admin = createAdminClient();

  const { data: category, error: catError } = await admin
    .from("categories")
    .select("id, is_hidden, owner_id")
    .eq("id", categoryId)
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (catError) return { status: "error", reason: "unavailable" };
  if (!category) return { status: "error", reason: "category_not_found" };
  if (category.is_hidden) return { status: "error", reason: "category_hidden" };

  const { data, error } = await admin
    .from("expenses")
    .insert({
      owner_id: input.userId,
      amount: validation.amount,
      occurred_on: validation.occurredOn,
      category_id: categoryId,
      note: validation.note,
      channel,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", reason: "unavailable" };
  }

  return { status: "ok", id: data.id as string };
}

/** Load System fallback Category id + display name for the owner. */
export async function loadSystemFallbackCategory(
  userId: string,
): Promise<{ id: string; displayName: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select("id, display_name")
    .eq("owner_id", userId)
    .eq("is_system_fallback", true)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    displayName: data.display_name as string,
  };
}

export async function loadCategoryName(
  userId: string,
  categoryId: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("display_name")
    .eq("owner_id", userId)
    .eq("id", categoryId)
    .maybeSingle();
  return (data?.display_name as string | undefined) ?? "—";
}

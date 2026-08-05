"use server";

import { revalidatePath } from "next/cache";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { CommitActionError } from "@/lib/draft/error-messages";
import type { CaptureChannel, Draft, RecordKind } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import { createClient } from "@/lib/supabase/server";

export type CommitDraftResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: CommitActionError };

export type LoadPickerCategoriesResult =
  | { status: "ok"; categories: CategoryPickerItem[] }
  | { status: "error"; reason: "unauthenticated" | "unavailable" };

/**
 * Confirm form payload. Channel is omitted on purpose: the server sets
 * channel from the commit action (manual vs photo) so a client cannot forge
 * provenance across capture paths.
 */
export type CommitDraftInput = {
  kind: RecordKind;
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
};

function revalidateMoneySurfaces() {
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/history");
}

/** server-auth-actions: always verify session inside the action. */
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

/**
 * Visible Categories for the Expense picker (client opens confirm after
 * manual type pick). Same order as manage: seed then user A–Я.
 */
export async function loadPickerCategories(): Promise<LoadPickerCategoriesResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("is_hidden", false);

  if (error) return { status: "error", reason: "unavailable" };

  const categories = sortCategoriesForManage(
    (data ?? []).map(mapCategoryRow),
  ).map((c) => ({
    id: c.id,
    displayName: c.displayName,
  }));

  return { status: "ok", categories };
}

/**
 * Commit a confirmed manual Draft: inserts one Expense or one Income with
 * Channel fixed to `manual` on the server (not client-supplied).
 * On failure the client keeps the Draft on confirm for retry or Discard
 * (not Extraction failure — ADR-0003 / ADR-0008).
 */
export async function commitDraft(
  input: CommitDraftInput,
): Promise<CommitDraftResult> {
  return commitWithChannel(input, "manual");
}

/**
 * Commit a photo Expense Draft: channel forced to `photo`, kind forced to expense.
 */
export async function commitPhotoDraft(
  input: CommitDraftInput,
): Promise<CommitDraftResult> {
  return commitWithChannel({ ...input, kind: "expense" }, "photo");
}

async function commitWithChannel(
  input: CommitDraftInput,
  channel: CaptureChannel,
): Promise<CommitDraftResult> {
  const draft: Draft = {
    kind: input.kind,
    channel,
    amount: input.amount,
    occurredOn: input.occurredOn,
    categoryId: input.categoryId,
    note: input.note,
  };

  // async-defer-await: pure validation before auth / DB I/O
  const validation = validateCommit(draft);
  if (!validation.ok) {
    return { status: "error", reason: validation.reason };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  if (draft.kind === "expense") {
    const categoryId = validation.categoryId as string;

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, is_hidden")
      .eq("id", categoryId)
      .maybeSingle();

    if (catError) return { status: "error", reason: "unavailable" };
    if (!category) return { status: "error", reason: "category_not_found" };
    if (category.is_hidden) {
      return { status: "error", reason: "category_hidden" };
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        owner_id: user.id,
        amount: validation.amount,
        occurred_on: validation.occurredOn,
        category_id: categoryId,
        note: validation.note,
        channel,
      })
      .select("id")
      .single();

    if (error || !data) {
      // DB trigger rejects hidden Category (P0002) even if Hide raced past the pre-check.
      if (error && (error.code === "P0002" || error.message === "category_hidden")) {
        return { status: "error", reason: "category_hidden" };
      }
      // FK / check failures surface as unavailable for retry
      return { status: "error", reason: "unavailable" };
    }

    revalidateMoneySurfaces();
    return { status: "ok", id: data.id as string };
  }

  // Income: photo channel is rejected by validateCommit; only manual/voice.
  if (channel === "photo") {
    return { status: "error", reason: "invalid_channel_for_kind" };
  }

  const { data, error } = await supabase
    .from("incomes")
    .insert({
      owner_id: user.id,
      amount: validation.amount,
      occurred_on: validation.occurredOn,
      note: validation.note,
      channel,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateMoneySurfaces();
  return { status: "ok", id: data.id as string };
}

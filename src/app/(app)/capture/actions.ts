"use server";

import { revalidatePath } from "next/cache";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { CommitActionError } from "@/lib/draft/error-messages";
import type { Draft, RecordKind } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import { createClient } from "@/lib/supabase/server";

/** Channel for this action — never taken from the client (issue #25 manual path). */
const MANUAL_CHANNEL = "manual" as const;

export type CommitDraftResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: CommitActionError };

export type LoadPickerCategoriesResult =
  | { status: "ok"; categories: CategoryPickerItem[] }
  | { status: "error"; reason: "unauthenticated" | "unavailable" };

/**
 * Confirm form payload. Channel is omitted on purpose: the server sets
 * `manual` so a client cannot forge photo/voice provenance.
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
  const draft: Draft = {
    kind: input.kind,
    channel: MANUAL_CHANNEL,
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
        channel: MANUAL_CHANNEL,
      })
      .select("id")
      .single();

    if (error || !data) {
      // FK / check failures surface as unavailable for retry
      return { status: "error", reason: "unavailable" };
    }

    revalidateMoneySurfaces();
    return { status: "ok", id: data.id as string };
  }

  const { data, error } = await supabase
    .from("incomes")
    .insert({
      owner_id: user.id,
      amount: validation.amount,
      occurred_on: validation.occurredOn,
      note: validation.note,
      channel: MANUAL_CHANNEL,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateMoneySurfaces();
  return { status: "ok", id: data.id as string };
}

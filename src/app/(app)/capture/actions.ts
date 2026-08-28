"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultAccount,
  ensureDefaultAccount,
  listAccounts,
} from "@/lib/accounts/load-accounts";
import type { AccountPickerItem } from "@/lib/accounts/types";
import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { CommitActionError } from "@/lib/draft/error-messages";
import type { CaptureChannel, Draft, RecordKind } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import { getEffectiveRate } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";

export type CommitDraftResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: CommitActionError };

export type LoadPickerCategoriesResult =
  | { status: "ok"; categories: CategoryPickerItem[] }
  | { status: "error"; reason: "unauthenticated" | "unavailable" };

export type LoadPickerAccountsResult =
  | { status: "ok"; accounts: AccountPickerItem[] }
  | { status: "error"; reason: "unauthenticated" | "unavailable" };

/**
 * Confirm form payload. Channel is omitted on purpose: the server sets
 * channel from the commit action (manual vs photo) so a client cannot forge
 * provenance across capture paths. Currency is omitted too: it comes from the
 * Account the server resolves (ADR-0014).
 */
export type CommitDraftInput = {
  kind: RecordKind;
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
  /** Manual capture picks an Account; other Channels fall back to the default. */
  accountId?: string;
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

/** Accounts for the manual confirm picker (default first). */
export async function loadPickerAccounts(): Promise<LoadPickerAccountsResult> {
  const { user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  try {
    const accounts = await listAccounts();
    return {
      status: "ok",
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        isDefault: a.isDefault,
      })),
    };
  } catch {
    return { status: "error", reason: "unavailable" };
  }
}

/**
 * Commit a confirmed manual Draft: inserts one Expense or one Income with
 * Channel fixed to `manual` on the server (not client-supplied) and the
 * Account the user picked.
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

/**
 * Commit a voice Draft: channel forced to `voice`.
 * Kind may be expense or income (confirm-time switch, ADR-0002).
 */
export async function commitVoiceDraft(
  input: CommitDraftInput,
): Promise<CommitDraftResult> {
  return commitWithChannel(input, "voice");
}

async function commitWithChannel(
  input: CommitDraftInput,
  channel: CaptureChannel,
): Promise<CommitDraftResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  // Server trust boundary: the Account decides the Currency (ADR-0014).
  // Manual capture names an Account of this owner; every other Channel and an
  // unknown id fall back to the default till so fast capture never stalls.
  const account = await resolveCommitAccount(input.accountId, channel);
  if (!account) {
    return { status: "error", reason: "account_not_found" };
  }

  const draft: Draft = {
    kind: input.kind,
    channel,
    amount: input.amount,
    occurredOn: input.occurredOn,
    categoryId: input.categoryId,
    note: input.note,
    accountId: account.id,
    currency: account.currency,
  };

  // async-defer-await: pure shape validation before rate / DB I/O
  const shapeCheck = validateCommit(draft);
  if (
    !shapeCheck.ok &&
    shapeCheck.reason !== "currency_rate_unavailable"
  ) {
    return { status: "error", reason: shapeCheck.reason };
  }

  // Rate resolved server-side only when the commit involves a non-BYN Account.
  let fx: { rate: number } | null = null;
  if (account.currency !== "BYN") {
    const effective = await getEffectiveRate(account.currency);
    if (!effective) {
      return { status: "error", reason: "currency_rate_unavailable" };
    }
    fx = { rate: effective.rate };
  }

  const validation = validateCommit(draft, fx);
  if (!validation.ok) {
    return { status: "error", reason: validation.reason };
  }

  const snapshotColumns = {
    currency: validation.currency,
    original_amount:
      validation.currency === "BYN" ? null : validation.originalAmount,
    fx_rate: validation.fxRate,
  };

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
        account_id: account.id,
        amount: validation.amount,
        ...snapshotColumns,
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
      account_id: account.id,
      amount: validation.amount,
      ...snapshotColumns,
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

/**
 * Account a Commit writes to: the picked one for manual capture (must belong
 * to this owner), the default till for photo / voice / unknown ids.
 */
async function resolveCommitAccount(
  inputAccountId: string | undefined,
  channel: CaptureChannel,
) {
  if (channel === "manual" && inputAccountId) {
    const accounts = await listAccounts();
    const picked = accounts.find((a) => a.id === inputAccountId);
    if (picked) return picked;
    // A stale picker value still commits somewhere honest: the default till.
  }

  return (await getDefaultAccount()) ?? (await ensureDefaultAccount());
}

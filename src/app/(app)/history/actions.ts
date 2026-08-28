"use server";

import { revalidatePath } from "next/cache";
import { listAccounts } from "@/lib/accounts/load-accounts";
import type { Account } from "@/lib/accounts/types";
import type { DeleteActionError, EditActionError } from "@/lib/money/error-messages";
import type { HistoryKind } from "@/lib/money/history-types";
import type { Draft } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import { getEffectiveRate } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";

export type EditRecordResult =
  | { status: "ok" }
  | { status: "error"; reason: EditActionError };

export type DeleteRecordResult =
  | { status: "ok" }
  | { status: "error"; reason: DeleteActionError };

/**
 * Edit form payload. Channel and kind are never taken from the client for
 * mutation of provenance — kind selects the table; channel stays as stored.
 * `accountId` moves the record between Accounts (ADR-0014); the Amount is
 * always typed in that Account's Currency.
 */
export type EditRecordInput = {
  id: string;
  kind: HistoryKind;
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
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
 * Edit a committed Expense or Income (not a return to Draft).
 * Amount / Occurred on / Note (+ Category for Expense, + Account); Channel and
 * kind fixed. History, Monthly totals, and Remainders revalidate on success.
 */
export async function editCommittedRecord(
  input: EditRecordInput,
): Promise<EditRecordResult> {
  if (input.kind !== "expense" && input.kind !== "income") {
    return { status: "error", reason: "not_found" };
  }
  if (!input.id) {
    return { status: "error", reason: "not_found" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const existing = await loadExistingRecord(
    supabase,
    input.kind,
    input.id,
  );
  if (existing === "error") return { status: "error", reason: "unavailable" };
  if (!existing) return { status: "error", reason: "not_found" };

  // Server trust boundary: the target Account decides the Currency.
  const account = await resolveEditAccount(
    input.accountId,
    (existing.account_id as string | null) ?? null,
  );
  if (!account) return { status: "error", reason: "account_not_found" };

  // Channel is not user-editable after Commit. validateCommit only needs a
  // kind-legal stand-in so field rules run; the DB channel column is never written.
  const draft: Draft = {
    kind: input.kind,
    channel: "manual",
    amount: input.amount,
    occurredOn: input.occurredOn,
    categoryId: input.categoryId,
    note: input.note,
    accountId: account.id,
    currency: account.currency,
  };

  // async-defer-await: pure shape validation before rate / DB I/O
  const shapeCheck = validateCommit(draft);
  if (!shapeCheck.ok && shapeCheck.reason !== "currency_rate_unavailable") {
    return { status: "error", reason: shapeCheck.reason };
  }

  // Rate resolved server-side only when the save involves a non-BYN Account
  // (ADR-0013): an Edit recomputes BYN at the rate effective now.
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

  if (input.kind === "expense") {
    const categoryId = validation.categoryId as string;

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, is_hidden")
      .eq("id", categoryId)
      .maybeSingle();

    if (catError) return { status: "error", reason: "unavailable" };
    if (!category) return { status: "error", reason: "category_not_found" };

    // Hidden Category is allowed only as the record's current value (CONTEXT).
    // Pre-check for clear UX; DB trigger enforces the same rule atomically so a
    // concurrent Hide cannot win a check-then-update race (P0002).
    if (
      category.is_hidden &&
      category.id !== (existing.category_id as string)
    ) {
      return { status: "error", reason: "category_hidden" };
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        account_id: account.id,
        amount: validation.amount,
        ...snapshotColumns,
        occurred_on: validation.occurredOn,
        category_id: categoryId,
        note: validation.note,
        // channel intentionally omitted — immutable after Commit
      })
      .eq("id", input.id);

    if (error) {
      if (error.code === "P0002" || error.message === "category_hidden") {
        return { status: "error", reason: "category_hidden" };
      }
      return { status: "error", reason: "unavailable" };
    }

    revalidateMoneySurfaces();
    revalidatePath(`/history/expense/${input.id}`);
    return { status: "ok" };
  }

  const { error } = await supabase
    .from("incomes")
    .update({
      account_id: account.id,
      amount: validation.amount,
      ...snapshotColumns,
      occurred_on: validation.occurredOn,
      note: validation.note,
    })
    .eq("id", input.id);

  if (error) return { status: "error", reason: "unavailable" };

  revalidateMoneySurfaces();
  revalidatePath(`/history/income/${input.id}`);
  return { status: "ok" };
}

/**
 * Hard Delete of a committed Expense or Income (domain Delete, not Discard).
 * History and Monthly total revalidate immediately after success.
 */
export async function deleteCommittedRecord(
  kind: HistoryKind,
  id: string,
): Promise<DeleteRecordResult> {
  if (kind !== "expense" && kind !== "income") {
    return { status: "error", reason: "not_found" };
  }
  if (!id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const table = kind === "expense" ? "expenses" : "incomes";
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", reason: "unavailable" };
  if (!data) return { status: "error", reason: "not_found" };

  revalidateMoneySurfaces();
  return { status: "ok" };
}

type ExistingRecord = { id: string; category_id?: string; account_id?: string | null };

/** Loads the row's immutable fields (Category / Account) for Edit checks. */
async function loadExistingRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: "expense" | "income",
  id: string,
): Promise<ExistingRecord | null | "error"> {
  const select =
    kind === "expense" ? "id, category_id, account_id" : "id, account_id";

  const { data, error } = await supabase
    .from(kind === "expense" ? "expenses" : "incomes")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(select as any)
    .eq("id", id)
    .maybeSingle();

  if (error) return "error";
  return (data as ExistingRecord | null) ?? null;
}

/**
 * Account an Edit writes to: the picked one (must belong to this owner), or
 * the record's current Account when the form sent nothing.
 */
async function resolveEditAccount(
  inputAccountId: string | undefined,
  currentAccountId: string | null,
): Promise<Account | null> {
  const accounts = await listAccounts();
  if (inputAccountId) {
    return accounts.find((a) => a.id === inputAccountId) ?? null;
  }
  if (currentAccountId) {
    return accounts.find((a) => a.id === currentAccountId) ?? null;
  }
  return accounts.find((a) => a.isDefault) ?? null;
}

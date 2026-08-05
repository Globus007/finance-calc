"use server";

import { revalidatePath } from "next/cache";
import type {
  DeleteActionError,
  EditActionError,
} from "@/lib/money/error-messages";
import type { HistoryKind } from "@/lib/money/history-types";
import type { Draft } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
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
 */
export type EditRecordInput = {
  id: string;
  kind: HistoryKind;
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
 * Edit a committed Expense or Income (not a return to Draft).
 * Amount / Occurred on / Note (+ Category for Expense); Channel and kind fixed.
 * History and Monthly total revalidate after a successful write.
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

  // Channel is not user-editable after Commit. validateCommit only needs a
  // kind-legal stand-in so field rules run; the DB channel column is never written.
  const draft: Draft = {
    kind: input.kind,
    channel: "manual",
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

  if (input.kind === "expense") {
    const categoryId = validation.categoryId as string;

    const [{ data: existing, error: loadError }, { data: category, error: catError }] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("id, category_id")
          .eq("id", input.id)
          .maybeSingle(),
        supabase
          .from("categories")
          .select("id, is_hidden")
          .eq("id", categoryId)
          .maybeSingle(),
      ]);

    if (loadError) return { status: "error", reason: "unavailable" };
    if (!existing) return { status: "error", reason: "not_found" };
    if (catError) return { status: "error", reason: "unavailable" };
    if (!category) return { status: "error", reason: "category_not_found" };

    // Hidden Category is allowed only as the record's current value (CONTEXT).
    if (
      category.is_hidden &&
      category.id !== (existing.category_id as string)
    ) {
      return { status: "error", reason: "category_hidden" };
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        amount: validation.amount,
        occurred_on: validation.occurredOn,
        category_id: categoryId,
        note: validation.note,
        // channel intentionally omitted — immutable after Commit
      })
      .eq("id", input.id);

    if (error) return { status: "error", reason: "unavailable" };

    revalidateMoneySurfaces();
    revalidatePath(`/history/expense/${input.id}`);
    return { status: "ok" };
  }

  const { data: existing, error: loadError } = await supabase
    .from("incomes")
    .select("id")
    .eq("id", input.id)
    .maybeSingle();

  if (loadError) return { status: "error", reason: "unavailable" };
  if (!existing) return { status: "error", reason: "not_found" };

  const { error } = await supabase
    .from("incomes")
    .update({
      amount: validation.amount,
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

"use server";

import { revalidatePath } from "next/cache";
import { listAccounts } from "@/lib/accounts/load-accounts";
import { isNoteTooLong, normalizeNote } from "@/lib/draft/normalize-note";
import { parseAmount } from "@/lib/draft/parse-amount";
import { isValidCalendarDate } from "@/lib/draft/validate-commit";
import { getEffectiveRates } from "@/lib/fx";
import { parseNumeric } from "@/lib/money/map-row";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import type { TransferActionError, TransferInput } from "@/lib/transfers/types";
import { validateTransfer } from "@/lib/transfers/validate-transfer";

export type TransferResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: TransferActionError };

export type TransferDeleteResult =
  | { status: "ok" }
  | { status: "error"; reason: TransferActionError };

function revalidateTransferSurfaces() {
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/history");
  revalidatePath("/transfer");
}

/** server-auth-actions: always verify session inside the action. */
async function requireUser() {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  return { supabase, user };
}

/**
 * Record a Transfer between own Accounts (ADR-0014): a direct user action,
 * never Draft → Commit. The Amount is typed in the source Account's Currency
 * and converts once at the rate effective now.
 */
export async function createTransfer(
  input: TransferInput,
): Promise<TransferResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const validation = await validateWithRates(input);
  if (!validation.ok) return { status: "error", reason: validation.reason };

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      owner_id: user.id,
      source_account_id: validation.sourceAccountId,
      target_account_id: validation.targetAccountId,
      amount: validation.amount,
      converted_amount: validation.convertedAmount,
      fx_rate: validation.fxRate,
      moved_on: validation.movedOn,
      note: validation.note,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateTransferSurfaces();
  return { status: "ok", id: data.id as string };
}

/**
 * Edit a committed Transfer. Remainders of both Accounts are live on read.
 * The rate fixed at the move is kept when Amount and Accounts do not change
 * (a Note or Occurred on edit must not rewrite history).
 */
export async function editTransfer(
  input: TransferInput & { id: string },
): Promise<TransferResult> {
  if (!input.id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data: existing, error: loadError } = await supabase
    .from("transfers")
    .select(
      "id, source_account_id, target_account_id, amount, converted_amount, fx_rate",
    )
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (loadError) return { status: "error", reason: "unavailable" };
  if (!existing) return { status: "error", reason: "not_found" };

  const typedAmount = parseAmount(input.amount);
  const moneyUnchanged =
    typedAmount !== null &&
    existing.source_account_id === input.sourceAccountId.trim() &&
    existing.target_account_id === input.targetAccountId.trim() &&
    typedAmount === parseNumeric(existing.amount);

  if (moneyUnchanged) {
    if (isNoteTooLong(input.note)) {
      return { status: "error", reason: "note_too_long" };
    }
    const movedOn = input.movedOn.trim();
    if (!movedOn || !isValidCalendarDate(movedOn)) {
      return { status: "error", reason: "date_required" };
    }

    const { data, error } = await supabase
      .from("transfers")
      .update({
        moved_on: movedOn,
        note: normalizeNote(input.note),
      })
      .eq("id", input.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return { status: "error", reason: "unavailable" };
    if (!data) return { status: "error", reason: "not_found" };

    revalidateTransferSurfaces();
    return { status: "ok", id: data.id as string };
  }

  const validation = await validateWithRates(input);
  if (!validation.ok) return { status: "error", reason: validation.reason };

  const { data, error } = await supabase
    .from("transfers")
    .update({
      source_account_id: validation.sourceAccountId,
      target_account_id: validation.targetAccountId,
      amount: validation.amount,
      converted_amount: validation.convertedAmount,
      fx_rate: validation.fxRate,
      moved_on: validation.movedOn,
      note: validation.note,
    })
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", reason: "unavailable" };
  if (!data) return { status: "error", reason: "not_found" };

  revalidateTransferSurfaces();
  return { status: "ok", id: data.id as string };
}

/** Hard Delete of a committed Transfer. */
export async function deleteTransfer(
  id: string,
): Promise<TransferDeleteResult> {
  if (!id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data, error } = await supabase
    .from("transfers")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", reason: "unavailable" };
  if (!data) return { status: "error", reason: "not_found" };

  revalidateTransferSurfaces();
  return { status: "ok" };
}

/** Accounts + effective rates are injected into pure validation (ADR-0013). */
async function validateWithRates(input: TransferInput) {
  const [accounts, rates] = await Promise.all([
    listAccounts(),
    getEffectiveRates(),
  ]);
  return validateTransfer(input, { accounts, rates });
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createAccount,
  deleteAccount,
  renameAccount,
  setDefaultAccount,
} from "@/lib/accounts/manage-accounts";
import type {
  AccountDeleteResult,
  AccountMutationResult,
} from "@/lib/accounts/types";
import { parseOverrideRate, setRateOverride } from "@/lib/fx";
import type { Currency, RateCurrency } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";

export type RateOverrideResult =
  | { status: "ok" }
  | {
      status: "error";
      reason:
        | "rate_required"
        | "rate_too_large"
        | "unauthenticated"
        | "unavailable";
    };

export type AccountActionResult = AccountMutationResult;
export type AccountDeleteActionResult = AccountDeleteResult;

function revalidateMoneySurfaces() {
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/history");
  revalidatePath("/settings");
  revalidatePath("/transfer");
}

/**
 * Set the manual X→BYN override for one Currency (story #5). Takes effect
 * immediately for every «≈» figure and for the next Commit/Edit-save/Transfer.
 */
export async function saveRateOverride(input: {
  currency: RateCurrency;
  rate: string;
}): Promise<RateOverrideResult> {
  // async-defer-await: pure parse before auth / DB I/O
  const parsed = parseOverrideRate(input.rate);
  if (!parsed.ok) return { status: "error", reason: parsed.reason };

  const ok = await setRateOverride(input.currency, parsed.rate);
  if (!ok) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateMoneySurfaces();
  return { status: "ok" };
}

/** Reset one Currency back to the NBRB rate — one tap (story #7). */
export async function resetRateOverride(input: {
  currency: RateCurrency;
}): Promise<RateOverrideResult> {
  const ok = await setRateOverride(input.currency, null);
  if (!ok) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateMoneySurfaces();
  return { status: "ok" };
}

/** Create a till with a fixed Currency (story #1). */
export async function createAccountAction(input: {
  name: string;
  currency: Currency;
}): Promise<AccountActionResult> {
  const result = await createAccount(input);
  if (result.status === "ok") revalidateMoneySurfaces();
  return result;
}

/** Rename a till (story #12). */
export async function renameAccountAction(input: {
  id: string;
  name: string;
}): Promise<AccountActionResult> {
  const result = await renameAccount(input);
  if (result.status === "ok") revalidateMoneySurfaces();
  return result;
}

/** Choose the fast-capture target (story #3 / #12). */
export async function setDefaultAccountAction(input: {
  id: string;
}): Promise<AccountActionResult> {
  const result = await setDefaultAccount(input);
  if (result.status === "ok") revalidateMoneySurfaces();
  return result;
}

/** Delete an empty till; the last one is never removed (story #12 / #15). */
export async function deleteAccountAction(input: {
  id: string;
}): Promise<AccountDeleteActionResult> {
  const result = await deleteAccount(input);
  if (result.status === "ok") revalidateMoneySurfaces();
  return result;
}

/** End the session from the app (story #25); no sign-out existed before. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

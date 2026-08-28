import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import { ACCOUNT_SELECT, mapAccountRow, type AccountDbRow } from "./map-row";
import type { Account } from "./types";

/** Default Account name for migrated and brand-new users (ADR-0014). */
export const DEFAULT_ACCOUNT_NAME = "Наличные";

/**
 * Every Account of the current user: default first, then creation order
 * (stable for pickers and the Home/Month switcher).
 */
export const listAccounts = cache(async (): Promise<Account[]> => {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("owner_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  // Fail closed: an empty list must never hide a real till.
  if (error) {
    throw new Error(`Failed to load accounts: ${error.message}`);
  }
  return (data as AccountDbRow[]).map(mapAccountRow);
});

/** id → Account, for History rows and Transfer labels. */
export async function loadAccountMap(): Promise<Record<string, Account>> {
  const accounts = await listAccounts();
  const map: Record<string, Account> = {};
  for (const account of accounts) map[account.id] = account;
  return map;
}

/** The fast-capture target (photo / voice / bot), or null when none exists. */
export const getDefaultAccount = cache(async (): Promise<Account | null> => {
  const accounts = await listAccounts();
  return accounts.find((a) => a.isDefault) ?? null;
});

/** One Account by id within the current session (null when missing/foreign). */
export async function loadAccount(id: string): Promise<Account | null> {
  if (!id) return null;
  const accounts = await listAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

/**
 * Self-heal for owners with no Account row (data written before the ADR-0014
 * migration, or a failed signup trigger): create the «Наличные» default.
 * Returns null when unauthenticated or the write failed.
 */
export async function ensureDefaultAccount(): Promise<Account | null> {
  const existing = await getDefaultAccount();
  if (existing) return existing;

  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) return null;

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      owner_id: user.id,
      name: DEFAULT_ACCOUNT_NAME,
      currency: "BYN",
      is_default: true,
    })
    .select(ACCOUNT_SELECT)
    .maybeSingle();

  if (error || !data) return null;
  return mapAccountRow(data as AccountDbRow);
}

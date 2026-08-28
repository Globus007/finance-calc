import { ACCOUNT_SELECT, mapAccountRow, type AccountDbRow } from "./map-row";
import { validateAccountName } from "./types";
import type { Currency } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import type {
  AccountDeleteResult,
  AccountMutationResult,
} from "./types";

async function requireUser() {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  return { supabase, user };
}

/** Create a till with a fixed Currency (never changed afterwards). */
export async function createAccount(input: {
  name: string;
  currency: Currency;
}): Promise<AccountMutationResult> {
  const validation = validateAccountName(input.name);
  if (!validation.ok) return { status: "error", reason: validation.reason };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      owner_id: user.id,
      name: validation.name,
      currency: input.currency,
      // The first Account of an owner is forced default by the DB anyway.
      is_default: false,
    })
    .select(ACCOUNT_SELECT)
    .maybeSingle();

  if (error || !data) {
    return { status: "error", reason: "unavailable" };
  }
  return { status: "ok", account: mapAccountRow(data as AccountDbRow) };
}

/** Rename a till. Currency is not an editable field (ADR-0014). */
export async function renameAccount(input: {
  id: string;
  name: string;
}): Promise<AccountMutationResult> {
  const validation = validateAccountName(input.name);
  if (!validation.ok) return { status: "error", reason: validation.reason };
  if (!input.id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data, error } = await supabase
    .from("accounts")
    .update({ name: validation.name })
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .select(ACCOUNT_SELECT)
    .maybeSingle();

  if (error) return { status: "error", reason: "unavailable" };
  if (!data) return { status: "error", reason: "not_found" };
  return { status: "ok", account: mapAccountRow(data as AccountDbRow) };
}

/** Move fast capture (photo / voice / bot) to another till. */
export async function setDefaultAccount(input: {
  id: string;
}): Promise<AccountMutationResult> {
  if (!input.id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { data: target, error: loadError } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (loadError) return { status: "error", reason: "unavailable" };
  if (!target) return { status: "error", reason: "not_found" };

  // Clear the previous default first: the partial unique index allows only one.
  const { error: clearError } = await supabase
    .from("accounts")
    .update({ is_default: false })
    .eq("owner_id", user.id)
    .eq("is_default", true)
    .neq("id", input.id);

  if (clearError) return { status: "error", reason: "unavailable" };

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_default: true })
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .select(ACCOUNT_SELECT)
    .maybeSingle();

  if (error || !data) return { status: "error", reason: "unavailable" };
  return { status: "ok", account: mapAccountRow(data as AccountDbRow) };
}

/** Committed records that pin an Account: Expenses, Incomes, Transfers. */
export async function countAccountRecords(input: {
  accountId: string;
}): Promise<number | null> {
  const { supabase, user } = await requireUser();
  if (!user) return null;

  const { accountId } = input;
  const queries = await Promise.all([
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("incomes")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId),
    supabase
      .from("transfers")
      .select("id", { count: "exact", head: true })
      .or(`source_account_id.eq.${accountId},target_account_id.eq.${accountId}`),
  ]);

  if (queries.some((q) => q.error)) return null;
  return queries.reduce((sum, q) => sum + (q.count ?? 0), 0);
}

/**
 * Delete a till — only when it holds no records and is not the owner's last
 * Account (both are also DB-enforced; checked here for an honest message).
 */
export async function deleteAccount(input: {
  id: string;
}): Promise<AccountDeleteResult> {
  if (!input.id) return { status: "error", reason: "not_found" };

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const accounts = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("owner_id", user.id);

  if (accounts.error) return { status: "error", reason: "unavailable" };
  const rows = (accounts.data ?? []) as AccountDbRow[];
  if (!rows.some((r) => r.id === input.id)) {
    return { status: "error", reason: "not_found" };
  }
  if (rows.length <= 1) return { status: "error", reason: "last_account" };

  const used = await countAccountRecords({ accountId: input.id });
  if (used === null) return { status: "error", reason: "unavailable" };
  if (used > 0) return { status: "error", reason: "not_empty" };

  const { data, error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", input.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", reason: "unavailable" };
  if (!data) return { status: "error", reason: "not_found" };
  return { status: "ok", id: data.id as string };
}

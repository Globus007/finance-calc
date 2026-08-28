/**
 * Commit Expense from bot Draft via service role (same expenses table as PWA).
 * The bot has no Account picker: it commits to the user's default Account and
 * the Amount is typed in that Account's Currency (ADR-0014).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Draft } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import { getEffectiveRate } from "@/lib/fx";
import type { Currency } from "@/lib/fx";

export type BotCommitResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: string };

type BotAccount = { id: string; currency: Currency };

/**
 * Persist a confirmed bot Draft as the mapped user.
 * Channel must be photo | voice (bot never commits manual).
 */
export async function commitBotDraft(input: {
  userId: string;
  draft: Draft;
}): Promise<BotCommitResult> {
  if (input.draft.kind !== "expense") {
    return { status: "error", reason: "kind_not_supported" };
  }

  const channel = input.draft.channel;
  if (channel !== "photo" && channel !== "voice") {
    return { status: "error", reason: "invalid_channel" };
  }

  const admin = createAdminClient();

  const account = await loadBotAccount(admin, input.userId);
  if (!account) return { status: "error", reason: "unavailable" };

  const draft: Draft = {
    ...input.draft,
    accountId: account.id,
    currency: account.currency,
  };

  let fx: { rate: number } | null = null;
  if (account.currency !== "BYN") {
    const effective = await getEffectiveRate(account.currency, input.userId);
    if (!effective) return { status: "error", reason: "currency_rate_unavailable" };
    fx = { rate: effective.rate };
  }

  const validation = validateCommit(draft, fx);
  if (!validation.ok) {
    return { status: "error", reason: validation.reason };
  }

  const categoryId = validation.categoryId as string;

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
      account_id: account.id,
      amount: validation.amount,
      currency: validation.currency,
      original_amount:
        validation.currency === "BYN" ? null : validation.originalAmount,
      fx_rate: validation.fxRate,
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

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Default Account of a bot user, self-healing for owners whose row predates
 * the ADR-0014 migration (or whose signup trigger did not run).
 */
async function loadBotAccount(
  admin: AdminClient,
  userId: string,
): Promise<BotAccount | null> {
  const { data, error } = await admin
    .from("accounts")
    .select("id, currency, is_default")
    .eq("owner_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (data) {
    return {
      id: data.id as string,
      currency: (data.currency as Currency) ?? "BYN",
    };
  }

  const { data: created, error: createError } = await admin
    .from("accounts")
    .insert({ owner_id: userId, name: "Наличные", currency: "BYN", is_default: true })
    .select("id, currency")
    .maybeSingle();

  if (createError || !created) return null;
  return { id: created.id as string, currency: (created.currency as Currency) ?? "BYN" };
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

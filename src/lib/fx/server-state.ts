import type { FxState, RateCurrency } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";

/**
 * Supabase-backed persistence for the FX seam (fx_rates table).
 * One row per (user, Currency) since ADR-0014; cache may be empty before the
 * first fetch for that Currency.
 */

type FxRow = {
  cached_rate: string | number | null;
  cached_at: string | null;
  override_rate: string | number | null;
  override_at: string | null;
};

function mapFxState(row: FxRow): FxState {
  return {
    cachedRate: row.cached_rate == null ? null : Number(row.cached_rate),
    cachedAt: row.cached_at,
    overrideRate: row.override_rate == null ? null : Number(row.override_rate),
    overrideAt: row.override_at,
  };
}

/**
 * Owner whose FX state to read: the session by default, an explicit id when a
 * service-role caller (Telegram bot) resolves a rate for its user.
 */
/** Per-(user, Currency) FX state, or null when unauthenticated / no row yet. */
export async function loadFxState(
  currency: RateCurrency,
  ownerId?: string,
): Promise<FxState | null> {
  const owner = ownerId ?? (await sessionOwnerId());
  if (!owner) return null;

  const supabase = ownerId ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("fx_rates")
    .select("cached_rate, cached_at, override_rate, override_at")
    .eq("owner_id", owner)
    .eq("currency", currency)
    .maybeSingle();

  if (error || !data) return null;
  return mapFxState(data as FxRow);
}

/** Session owner id (no admin client needed for reads by RLS). */
async function sessionOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  return user?.id ?? null;
}

/** Owner id of the current session, for session-scoped upserts. */
async function requireOwnerId(): Promise<string | null> {
  return sessionOwnerId();
}

export async function saveFxCache(
  currency: RateCurrency,
  rate: number,
  at: Date,
  ownerId?: string,
): Promise<void> {
  const owner = ownerId ?? (await requireOwnerId());
  if (!owner) return;

  const supabase = ownerId ? createAdminClient() : await createClient();
  await supabase.from("fx_rates").upsert(
    {
      owner_id: owner,
      currency,
      cached_rate: rate,
      cached_at: at.toISOString(),
    },
    { onConflict: "owner_id,currency" },
  );
}

/** Writes or clears (null) the manual override; keeps the cache untouched. */
export async function saveFxOverride(
  currency: RateCurrency,
  rate: number | null,
  at: Date,
  ownerId?: string,
): Promise<boolean> {
  const owner = ownerId ?? (await requireOwnerId());
  if (!owner) return false;

  const supabase = ownerId ? createAdminClient() : await createClient();
  const { error } = await supabase.from("fx_rates").upsert(
    {
      owner_id: owner,
      currency,
      override_rate: rate,
      override_at: rate == null ? null : at.toISOString(),
    },
    { onConflict: "owner_id,currency" },
  );
  return !error;
}

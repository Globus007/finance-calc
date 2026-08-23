import type { FxState } from "./types";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";

/**
 * Supabase-backed persistence for the FX seam (fx_rates table).
 * One row per user; cache may be empty before the first successful fetch.
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

/** Per-user FX state, or null when unauthenticated or no row exists yet. */
export async function loadFxState(): Promise<FxState | null> {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) return null;

  const { data, error } = await supabase
    .from("fx_rates")
    .select("cached_rate, cached_at, override_rate, override_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return mapFxState(data as FxRow);
}

/** Owner id of the current session, for upserts below. */
async function requireOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  return user?.id ?? null;
}

export async function saveFxCache(
  rate: number,
  at: Date,
): Promise<void> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return;

  const supabase = await createClient();
  await supabase.from("fx_rates").upsert(
    { owner_id: ownerId, cached_rate: rate, cached_at: at.toISOString() },
    { onConflict: "owner_id" },
  );
}

/** Writes or clears (null) the manual override; keeps the cache untouched. */
export async function saveFxOverride(
  rate: number | null,
  at: Date,
): Promise<boolean> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return false;

  const supabase = await createClient();
  const { error } = await supabase.from("fx_rates").upsert(
    {
      owner_id: ownerId,
      override_rate: rate,
      override_at: rate == null ? null : at.toISOString(),
    },
    { onConflict: "owner_id" },
  );
  return !error;
}

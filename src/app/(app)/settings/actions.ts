"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseOverrideRate, setRateOverride } from "@/lib/fx";
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

function revalidateUsdSurfaces() {
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/history");
  revalidatePath("/settings");
}

/**
 * Set the manual USD→BYN override (story #5). Takes effect immediately for
 * every $ figure and for the next USD Commit/Edit-save.
 */
export async function saveRateOverride(input: {
  rate: string;
}): Promise<RateOverrideResult> {
  // async-defer-await: pure parse before auth / DB I/O
  const parsed = parseOverrideRate(input.rate);
  if (!parsed.ok) return { status: "error", reason: parsed.reason };

  const ok = await setRateOverride(parsed.rate);
  if (!ok) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateUsdSurfaces();
  return { status: "ok" };
}

/** Reset back to the NBRB rate — one tap (story #7). */
export async function resetRateOverride(): Promise<RateOverrideResult> {
  const ok = await setRateOverride(null);
  if (!ok) {
    return { status: "error", reason: "unavailable" };
  }

  revalidateUsdSurfaces();
  return { status: "ok" };
}

/** End the session from the app (story #25); no sign-out existed before. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

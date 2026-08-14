"use server";

import { revalidatePath } from "next/cache";
import { todayInMinsk, tomorrowInMinsk } from "@/lib/dates/minsk-today";
import type { SetOpeningActionError } from "@/lib/opening/error-messages";
import type { SetOpeningInput } from "@/lib/opening/types";
import { validateSetOpening } from "@/lib/opening/validate-set-opening";
import { createClient } from "@/lib/supabase/server";

export type SetOpeningResult =
  | { status: "ok" }
  | { status: "error"; reason: SetOpeningActionError };

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
 * Write or replace the user's single Opening (not Draft → Commit).
 * Revalidates Home only — Month does not show Remainder.
 */
export async function setOpening(
  input: SetOpeningInput,
): Promise<SetOpeningResult> {
  // async-defer-await: pure validation before auth / DB I/O
  const validation = validateSetOpening(input, {
    today: todayInMinsk(),
    tomorrow: tomorrowInMinsk(),
  });
  if (!validation.ok) {
    return { status: "error", reason: validation.reason };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  const { error } = await supabase.from("openings").upsert(
    {
      owner_id: user.id,
      amount: validation.amount,
      opened_on: validation.openedOn,
    },
    { onConflict: "owner_id" },
  );

  if (error) return { status: "error", reason: "unavailable" };

  revalidatePath("/");
  return { status: "ok" };
}

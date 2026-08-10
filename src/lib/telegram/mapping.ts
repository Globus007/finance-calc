/**
 * Durable telegram_id → auth.users lookup (ADR-0009 bot authorize/deny).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type TelegramLink = {
  telegramId: string;
  userId: string;
};

/**
 * Resolve mapped Supabase user for a Telegram user id.
 * Returns null when unmapped (deny — never create users here).
 */
export async function lookupTelegramUser(
  telegramId: string,
): Promise<TelegramLink | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_user_links")
    .select("telegram_id, user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    telegramId: data.telegram_id as string,
    userId: data.user_id as string,
  };
}

/**
 * App-owned bot session: one extract job / Draft per telegram_id (ADR-0010).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Draft } from "@/lib/draft/types";

export type BotPhase =
  | "idle"
  | "extracting"
  | "confirm"
  | "awaiting_amount"
  | "awaiting_occurred_on"
  | "awaiting_note";

export type BotSession = {
  telegramId: string;
  phase: BotPhase;
  draft: Draft | null;
  cardChatId: number | null;
  cardMessageId: number | null;
  progressMessageId: number | null;
  categoryPage: number;
  updatedAt: string;
};

/** Idle 24h wall-clock since last action → auto-Discard (ADR-0010). */
export const BOT_DRAFT_IDLE_MS = 24 * 60 * 60 * 1000;

type Row = {
  telegram_id: string;
  phase: BotPhase;
  draft: Draft | null;
  card_chat_id: number | null;
  card_message_id: number | null;
  progress_message_id: number | null;
  category_page: number | null;
  updated_at: string;
};

function mapRow(row: Row): BotSession {
  return {
    telegramId: row.telegram_id,
    phase: row.phase,
    draft: row.draft,
    cardChatId: row.card_chat_id,
    cardMessageId: row.card_message_id,
    progressMessageId: row.progress_message_id,
    categoryPage: row.category_page ?? 0,
    updatedAt: row.updated_at,
  };
}

export async function loadBotSession(
  telegramId: string,
): Promise<BotSession | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_bot_sessions")
    .select(
      "telegram_id, phase, draft, card_chat_id, card_message_id, progress_message_id, category_page, updated_at",
    )
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Row);
}

export async function upsertBotSession(input: {
  telegramId: string;
  phase: BotPhase;
  draft: Draft | null;
  cardChatId: number | null;
  cardMessageId: number | null;
  progressMessageId?: number | null;
  categoryPage?: number;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("telegram_bot_sessions").upsert(
    {
      telegram_id: input.telegramId,
      phase: input.phase,
      draft: input.draft,
      card_chat_id: input.cardChatId,
      card_message_id: input.cardMessageId,
      progress_message_id: input.progressMessageId ?? null,
      category_page: input.categoryPage ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );
  if (error) {
    throw new Error(`telegram_bot_sessions upsert: ${error.message}`);
  }
}

export async function clearBotSession(telegramId: string): Promise<void> {
  await upsertBotSession({
    telegramId,
    phase: "idle",
    draft: null,
    cardChatId: null,
    cardMessageId: null,
    progressMessageId: null,
    categoryPage: 0,
  });
}

/** True when session has an open Draft/extract that expired by idle TTL. */
export function isBotSessionIdleExpired(
  session: BotSession,
  now: Date = new Date(),
): boolean {
  if (session.phase === "idle" && !session.draft) return false;
  if (session.phase === "idle") return false;
  const updated = Date.parse(session.updatedAt);
  if (!Number.isFinite(updated)) return false;
  return now.getTime() - updated > BOT_DRAFT_IDLE_MS;
}

export function isOpenDraftPhase(phase: BotPhase): boolean {
  return (
    phase === "confirm" ||
    phase === "awaiting_amount" ||
    phase === "awaiting_occurred_on" ||
    phase === "awaiting_note"
  );
}

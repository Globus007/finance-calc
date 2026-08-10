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
  /** Opaque token for the in-flight extract job; null when not extracting. */
  extractJobId: string | null;
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
  extract_job_id: string | null;
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
    extractJobId: row.extract_job_id ?? null,
    categoryPage: row.category_page ?? 0,
    updatedAt: row.updated_at,
  };
}

const SESSION_COLUMNS =
  "telegram_id, phase, draft, card_chat_id, card_message_id, progress_message_id, extract_job_id, category_page, updated_at";

export async function loadBotSession(
  telegramId: string,
): Promise<BotSession | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_bot_sessions")
    .select(SESSION_COLUMNS)
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
  extractJobId?: string | null;
  categoryPage?: number;
}): Promise<void> {
  const admin = createAdminClient();
  const extractJobId =
    input.phase === "extracting" ? (input.extractJobId ?? null) : null;
  const { error } = await admin.from("telegram_bot_sessions").upsert(
    {
      telegram_id: input.telegramId,
      phase: input.phase,
      draft: input.draft,
      card_chat_id: input.cardChatId,
      card_message_id: input.cardMessageId,
      progress_message_id: input.progressMessageId ?? null,
      extract_job_id: extractJobId,
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
    extractJobId: null,
    categoryPage: 0,
  });
}

/**
 * Atomically claim an open Draft for Commit: clears the session row and
 * returns the pre-clear snapshot. Concurrent Commit/Discard loses the race
 * (null) so only one expense insert can proceed.
 *
 * On Commit persist failure the caller must restore via upsertBotSession
 * (ADR-0008: stay on confirm for retry).
 */
export async function claimOpenBotSessionForCommit(input: {
  telegramId: string;
  cardMessageId: number;
}): Promise<BotSession | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "claim_telegram_bot_session_for_commit",
    {
      p_telegram_id: input.telegramId,
      p_card_message_id: input.cardMessageId,
    },
  );

  if (error) {
    throw new Error(
      `telegram_bot_sessions claim for commit: ${error.message}`,
    );
  }
  if (data == null) return null;

  const row = data as Row;
  if (!row.draft) return null;
  return mapRow(row);
}

/**
 * Atomically start an extract job. Concurrent starters lose (null) while
 * another job is already extracting (ADR-0010: one extract at a time).
 * On success, `previous` is the pre-claim snapshot for open-Draft card cleanup.
 */
export async function claimBotSessionForExtract(input: {
  telegramId: string;
  extractJobId: string;
}): Promise<{ previous: BotSession | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "claim_telegram_bot_session_for_extract",
    {
      p_telegram_id: input.telegramId,
      p_extract_job_id: input.extractJobId,
    },
  );

  if (error) {
    throw new Error(
      `telegram_bot_sessions claim for extract: ${error.message}`,
    );
  }
  if (data == null) return null;

  const payload = data as { previous: Row | null };
  return {
    previous: payload.previous ? mapRow(payload.previous) : null,
  };
}

/** Attach progress message id only while this extract job still owns the row. */
export async function setExtractProgressMessage(input: {
  telegramId: string;
  extractJobId: string;
  progressMessageId: number | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("telegram_bot_sessions")
    .update({
      progress_message_id: input.progressMessageId,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_id", input.telegramId)
    .eq("phase", "extracting")
    .eq("extract_job_id", input.extractJobId);

  if (error) {
    throw new Error(
      `telegram_bot_sessions set extract progress: ${error.message}`,
    );
  }
}

/**
 * Promote extract → confirm only if extract_job_id still matches.
 * Returns false when cancelled or superseded by another job.
 */
export async function completeBotSessionExtract(input: {
  telegramId: string;
  extractJobId: string;
  draft: Draft;
  cardChatId: number;
  cardMessageId: number;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "complete_telegram_bot_session_extract",
    {
      p_telegram_id: input.telegramId,
      p_extract_job_id: input.extractJobId,
      p_draft: input.draft,
      p_card_chat_id: input.cardChatId,
      p_card_message_id: input.cardMessageId,
    },
  );

  if (error) {
    throw new Error(
      `telegram_bot_sessions complete extract: ${error.message}`,
    );
  }
  return data === true;
}

/** Clear idle only if this extract job still owns the session. */
export async function clearBotSessionIfExtractJob(input: {
  telegramId: string;
  extractJobId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "clear_telegram_bot_session_extract",
    {
      p_telegram_id: input.telegramId,
      p_extract_job_id: input.extractJobId,
    },
  );

  if (error) {
    throw new Error(
      `telegram_bot_sessions clear extract: ${error.message}`,
    );
  }
  return data === true;
}

/** True when this extract job is still the active owner of the session. */
export function ownsExtractJob(
  session: BotSession | null | undefined,
  extractJobId: string,
): boolean {
  return (
    !!session &&
    session.phase === "extracting" &&
    session.extractJobId === extractJobId
  );
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

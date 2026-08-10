/**
 * Telegram Bot API webhook (PRD #69).
 * Verify secret_token header; process message / callback_query; always 2xx after auth.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getTelegramWebhookSecret,
  isTelegramBotConfigured,
} from "@/lib/telegram/config";
import type { TelegramUpdate } from "@/lib/telegram/bot-api";
import { handleTelegramUpdate } from "@/lib/telegram/handle-update";

export async function POST(request: NextRequest) {
  // Isolation: without TG env, route is a dead 404 — browser UX unchanged.
  if (!isTelegramBotConfigured()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const expected = getTelegramWebhookSecret();
  if (!expected) {
    // Misconfigured: token set but no webhook secret — refuse deliveries.
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (!header || header !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    // Return 2xx so Telegram does not retry forever; log for ops (no secrets).
    console.error("[telegram webhook]", {
      update_id: update.update_id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}

/** Health / accidental GET — not used by Telegram. */
export async function GET() {
  if (!isTelegramBotConfigured()) {
    return NextResponse.json({ ok: false, bot: "disabled" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bot: "telegram" });
}

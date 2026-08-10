/**
 * SPIKE: telegram-feel-demo — server-side Mini App initData HMAC validation.
 * Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type ValidateInitDataResult =
  | { ok: true; telegramId: string; authDate: number }
  | {
      ok: false;
      reason: "invalid" | "stale" | "missing_user";
    };

/**
 * Validate Telegram Mini App `initData` query string with the bot token.
 * Rejects bad HMAC, missing user, and stale `auth_date`.
 */
export function validateWebAppInitData(
  initData: string,
  botToken: string,
  options: {
    maxAgeSec?: number;
    /** Injected for tests; defaults to current unix seconds. */
    nowSec?: number;
  } = {},
): ValidateInitDataResult {
  const maxAgeSec = options.maxAgeSec ?? 300;
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);

  if (!initData || !botToken) {
    return { ok: false, reason: "invalid" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]+$/i.test(hash)) {
    return { ok: false, reason: "invalid" };
  }

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // secret_key = HMAC_SHA256(key = "WebAppData", message = bot_token)
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "invalid" };
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: "invalid" };
  }
  if (nowSec - authDate > maxAgeSec) {
    return { ok: false, reason: "stale" };
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, reason: "missing_user" };
  }

  let userId: unknown;
  try {
    const user = JSON.parse(userRaw) as { id?: unknown };
    userId = user.id;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (typeof userId !== "number" && typeof userId !== "string") {
    return { ok: false, reason: "missing_user" };
  }
  const telegramId = String(userId);
  if (!telegramId || telegramId === "undefined" || telegramId === "null") {
    return { ok: false, reason: "missing_user" };
  }

  return { ok: true, telegramId, authDate };
}

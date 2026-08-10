/**
 * Telegram bot env gating.
 * When bot token / webhook secret are unset, TG routes no-op and browser OTP is unchanged.
 */

export function getTelegramBotToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t ? t : null;
}

export function getTelegramWebhookSecret(): string | null {
  const t = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  return t ? t : null;
}

/** True when bot token is present (webhook + optional Mini App residual paths). */
export function isTelegramBotConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

/** @deprecated use isTelegramBotConfigured */
export function isTelegramSpikeConfigured(): boolean {
  return isTelegramBotConfigured();
}

/** Max age of Mini App initData for residual session exchange (seconds). */
export const INIT_DATA_MAX_AGE_SEC = 300;

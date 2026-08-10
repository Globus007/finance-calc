/**
 * Minimal Telegram Bot API client (no third-party SDK).
 */

import { getTelegramBotToken } from "./config";

const API_BASE = "https://api.telegram.org";

export type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export type ForceReplyMarkup = {
  force_reply: true;
  selective?: boolean;
  input_field_placeholder?: string;
};

export type ReplyMarkup = InlineKeyboardMarkup | ForceReplyMarkup;

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramMessage = {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  voice?: {
    file_id: string;
    duration?: number;
    mime_type?: string;
    file_size?: number;
  };
  document?: { file_id: string; mime_type?: string; file_size?: number };
  audio?: { file_id: string; duration?: number; mime_type?: string; file_size?: number };
  video?: { file_id: string; duration?: number; file_size?: number };
  video_note?: { file_id: string; length?: number; duration?: number; file_size?: number };
  sticker?: { file_id: string; file_size?: number };
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type ApiResult<T> = { ok: true; result: T } | { ok: false; description?: string };

async function callApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN missing" };
  }

  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };

  if (!json.ok || json.result === undefined) {
    return { ok: false, description: json.description ?? res.statusText };
  }
  return { ok: true, result: json.result };
}

export async function sendMessage(input: {
  chatId: number;
  text: string;
  replyMarkup?: ReplyMarkup;
}): Promise<ApiResult<TelegramMessage>> {
  return callApi<TelegramMessage>("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    reply_markup: input.replyMarkup,
  });
}

export async function editMessageText(input: {
  chatId: number;
  messageId: number;
  text: string;
  replyMarkup?: InlineKeyboardMarkup | { inline_keyboard: [] };
}): Promise<ApiResult<TelegramMessage | boolean>> {
  return callApi("editMessageText", {
    chat_id: input.chatId,
    message_id: input.messageId,
    text: input.text,
    reply_markup: input.replyMarkup,
  });
}

export async function answerCallbackQuery(input: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}): Promise<ApiResult<boolean>> {
  return callApi("answerCallbackQuery", {
    callback_query_id: input.callbackQueryId,
    text: input.text,
    show_alert: input.showAlert,
  });
}

export async function getFile(fileId: string): Promise<
  ApiResult<{ file_id: string; file_path?: string; file_size?: number }>
> {
  return callApi("getFile", { file_id: fileId });
}

/** Download file bytes from Telegram (path from getFile). */
export async function downloadTelegramFile(
  filePath: string,
): Promise<{ ok: true; bytes: ArrayBuffer } | { ok: false; description: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN missing" };
  }
  const res = await fetch(`${API_BASE}/file/bot${token}/${filePath}`);
  if (!res.ok) {
    return { ok: false, description: `download ${res.status}` };
  }
  const bytes = await res.arrayBuffer();
  return { ok: true, bytes };
}

/** Largest photo size by area (then file_size). */
export function pickLargestPhoto(
  photo: TelegramPhotoSize[],
): TelegramPhotoSize | null {
  if (!photo.length) return null;
  return photo.reduce((best, cur) => {
    const bestArea = best.width * best.height;
    const curArea = cur.width * cur.height;
    if (curArea > bestArea) return cur;
    if (curArea === bestArea && (cur.file_size ?? 0) > (best.file_size ?? 0)) {
      return cur;
    }
    return best;
  });
}

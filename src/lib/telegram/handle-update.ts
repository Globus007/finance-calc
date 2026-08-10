/**
 * Telegram bot update handler — Expense photo/voice → in-chat confirm (PRD #69).
 */

import { parseAmount } from "@/lib/draft/parse-amount";
import { isNoteTooLong } from "@/lib/draft/normalize-note";
import type { Draft } from "@/lib/draft/types";
import { validateCommit } from "@/lib/draft/validate-commit";
import {
  answerCallbackQuery,
  editMessageText,
  sendMessage,
  type TelegramUpdate,
} from "./bot-api";
import { loadVisibleCategoriesForUser } from "./bot-categories";
import {
  claimBotSessionForExtract,
  claimOpenBotSessionForCommit,
  clearBotSession,
  clearBotSessionIfExtractJob,
  completeBotSessionExtract,
  isBotSessionIdleExpired,
  isOpenDraftPhase,
  loadBotSession,
  ownsExtractJob,
  restoreBotSessionAfterFailedCommit,
  setExtractProgressMessage,
  upsertBotSession,
  type BotSession,
} from "./bot-state";
import {
  commitBotDraft,
  loadCategoryName,
} from "./commit-bot-draft";
import {
  BOT_AWAITING_AMOUNT,
  BOT_AWAITING_NOTE,
  BOT_AWAITING_OCCURRED_ON,
  BOT_CATEGORIES_MISSING,
  BOT_COMMITTED,
  BOT_DENY_NON_PRIVATE,
  BOT_DENY_UNMAPPED,
  BOT_DISCARDED,
  BOT_DRAFT_CLOSED,
  BOT_EXTRACTION_FAILURE_PHOTO,
  BOT_EXTRACTION_FAILURE_VOICE,
  BOT_EXTRACT_CANCELLED,
  BOT_HELP,
  BOT_HINT_TEXT,
  BOT_INVALID_AMOUNT,
  BOT_INVALID_DATE,
  BOT_NO_OPEN_DRAFT,
  BOT_NOTE_TOO_LONG,
  BOT_PHOTO_OVERSIZE,
  BOT_PRECAPTURE_FAIL,
  BOT_PROGRESS_DONE_PHOTO,
  BOT_PROGRESS_DONE_VOICE,
  BOT_PROGRESS_PHOTO,
  BOT_PROGRESS_VOICE,
  BOT_TIMEOUT_DISCARD,
  BOT_UNSUPPORTED_MEDIA,
  BOT_VOICE_LIMIT,
  BOT_WAIT_OR_CANCEL,
} from "./copy";
import {
  CB_CANCEL_EXTRACT,
  CB_COMMIT,
  CB_DISCARD,
  CB_EDIT_AMOUNT,
  CB_EDIT_NOTE,
  CB_EDIT_OCCURRED_ON,
  draftCardKeyboard,
  emptyKeyboard,
  extractProgressKeyboard,
  formatDraftCardText,
} from "./draft-card";
import {
  CB_CATEGORY_BACK,
  CB_OPEN_CATEGORY,
  categoryPickerKeyboard,
  parseCategoryPage,
  parseCategoryPick,
  resolveCategoryByIndex,
} from "./category-keyboard";
import { lookupTelegramUser } from "./mapping";
import { runBotMediaPipeline } from "./media-pipeline";
import { parseOccurredOnReply } from "./parse-occurred-on";
import { preCaptureFromMessage } from "./pre-capture";

export async function handleTelegramUpdate(
  update: TelegramUpdate,
): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update);
    return;
  }
  if (update.message) {
    await handleMessage(update);
  }
}

async function handleMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.from || message.from.is_bot) return;

  const telegramId = String(message.from.id);
  const chatId = message.chat.id;

  if (message.chat.type !== "private") {
    await sendMessage({ chatId, text: BOT_DENY_NON_PRIVATE });
    return;
  }

  const link = await lookupTelegramUser(telegramId);
  if (!link) {
    await sendMessage({ chatId, text: BOT_DENY_UNMAPPED });
    return;
  }

  // TTL auto-Discard before other work.
  await maybeAutoDiscardExpired(telegramId);

  const text = (message.text ?? "").trim();
  const lower = text.toLowerCase();

  if (lower === "/start" || lower === "/help") {
    await sendMessage({ chatId, text: BOT_HELP });
    return;
  }

  if (
    lower === "/discard" ||
    lower === "/cancel" ||
    lower === "отмена"
  ) {
    await discardOpenDraft(telegramId, chatId);
    return;
  }

  // Field ForceReply replies (commands already handled above).
  const session = await loadBotSession(telegramId);
  if (session?.draft) {
    if (session.phase === "awaiting_amount" && text) {
      await applyAmountReply({
        telegramId,
        userId: link.userId,
        chatId,
        session,
        text,
      });
      return;
    }
    if (session.phase === "awaiting_occurred_on" && text) {
      await applyOccurredOnReply({
        telegramId,
        userId: link.userId,
        chatId,
        session,
        text,
      });
      return;
    }
    // Empty / whitespace reply clears Note (ADR-0010).
    if (session.phase === "awaiting_note" && message.text !== undefined) {
      await applyNoteReply({
        telegramId,
        userId: link.userId,
        chatId,
        session,
        text: message.text,
      });
      return;
    }
  }

  // Media intake (photo / voice) or unsupported media types
  const hasUnsupportedMedia = Boolean(
    message.document ||
      message.audio ||
      message.video ||
      message.video_note ||
      message.sticker,
  );

  if (message.photo?.length || message.voice || hasUnsupportedMedia) {
    // Soft check only — exclusive claim inside handleMediaCapture is authoritative.
    const current = await loadBotSession(telegramId);
    if (current?.phase === "extracting") {
      await sendMessage({ chatId, text: BOT_WAIT_OR_CANCEL });
      return;
    }

    const pre = preCaptureFromMessage(message);
    if (!pre.ok) {
      await sendMessage({
        chatId,
        text: preCaptureCopy(pre.reason),
      });
      return;
    }

    await handleMediaCapture({
      telegramId,
      userId: link.userId,
      chatId,
      preCapture: pre,
      caption: message.caption,
    });
    return;
  }

  if (text) {
    await sendMessage({ chatId, text: BOT_HINT_TEXT });
  }
}

async function handleMediaCapture(input: {
  telegramId: string;
  userId: string;
  chatId: number;
  preCapture: Extract<
    ReturnType<typeof preCaptureFromMessage>,
    { ok: true }
  >;
  caption?: string | null;
}): Promise<void> {
  const { telegramId, userId, chatId, preCapture, caption } = input;
  const isPhoto = preCapture.channel === "photo";
  const extractJobId = crypto.randomUUID();

  // Exclusive extract ownership (token + phase). Concurrent media loses here.
  const claimed = await claimBotSessionForExtract({
    telegramId,
    extractJobId,
  });
  if (!claimed) {
    await sendMessage({ chatId, text: BOT_WAIT_OR_CANCEL });
    return;
  }

  // Implicit Discard of open Draft card (ADR-0010) after we own the session.
  const previous = claimed.previous;
  if (
    previous &&
    isOpenDraftPhase(previous.phase) &&
    previous.draft &&
    previous.cardChatId != null &&
    previous.cardMessageId != null
  ) {
    await editMessageText({
      chatId: previous.cardChatId,
      messageId: previous.cardMessageId,
      text: "Заменён новым сообщением.",
      replyMarkup: emptyKeyboard(),
    }).catch(() => undefined);
  }

  const progress = await sendMessage({
    chatId,
    text: isPhoto ? BOT_PROGRESS_PHOTO : BOT_PROGRESS_VOICE,
    replyMarkup: extractProgressKeyboard(),
  });

  const progressMessageId = progress.ok ? progress.result.message_id : null;
  await setExtractProgressMessage({
    telegramId,
    extractJobId,
    progressMessageId,
  });

  const result = await runBotMediaPipeline({
    userId,
    preCapture,
    caption,
    deps: {
      isCancelled: async () => {
        const s = await loadBotSession(telegramId);
        return !ownsExtractJob(s, extractJobId);
      },
    },
  });

  // Re-check ownership after pipeline (cancel or superseded job).
  const after = await loadBotSession(telegramId);
  if (!ownsExtractJob(after, extractJobId)) {
    if (progress.ok) {
      await editMessageText({
        chatId,
        messageId: progress.result.message_id,
        text: BOT_EXTRACT_CANCELLED,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  if (result.status === "cancelled") {
    await clearBotSessionIfExtractJob({ telegramId, extractJobId });
    if (progress.ok) {
      await editMessageText({
        chatId,
        messageId: progress.result.message_id,
        text: BOT_EXTRACT_CANCELLED,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  if (result.status === "pre_capture") {
    await clearBotSessionIfExtractJob({ telegramId, extractJobId });
    const copy =
      result.reason === "categories_unavailable"
        ? BOT_CATEGORIES_MISSING
        : result.reason === "size" || result.reason === "type"
          ? isPhoto
            ? BOT_PHOTO_OVERSIZE
            : BOT_VOICE_LIMIT
          : BOT_PRECAPTURE_FAIL; // download / upload / pipeline_error
    await sendMessage({ chatId, text: copy });
    if (progress.ok) {
      await editMessageText({
        chatId,
        messageId: progress.result.message_id,
        text: copy,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  if (result.status === "extraction_failure") {
    await clearBotSessionIfExtractJob({ telegramId, extractJobId });
    const copy = isPhoto
      ? BOT_EXTRACTION_FAILURE_PHOTO
      : BOT_EXTRACTION_FAILURE_VOICE;
    await sendMessage({ chatId, text: copy });
    if (progress.ok) {
      await editMessageText({
        chatId,
        messageId: progress.result.message_id,
        text: copy,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  const draft = result.draft;
  const categoryName = await loadCategoryName(userId, draft.categoryId);
  const cardText = formatDraftCardText({ draft, categoryName });
  const card = await sendMessage({
    chatId,
    text: cardText,
    replyMarkup: draftCardKeyboard(),
  });

  if (!card.ok) {
    await clearBotSessionIfExtractJob({ telegramId, extractJobId });
    await sendMessage({ chatId, text: "Не удалось показать черновик." });
    return;
  }

  const completed = await completeBotSessionExtract({
    telegramId,
    extractJobId,
    draft,
    cardChatId: chatId,
    cardMessageId: card.result.message_id,
  });

  if (!completed) {
    // Lost ownership between pipeline and confirm (cancel / concurrent claim).
    await editMessageText({
      chatId,
      messageId: card.result.message_id,
      text: BOT_DRAFT_CLOSED,
      replyMarkup: emptyKeyboard(),
    }).catch(() => undefined);
    if (progress.ok) {
      await editMessageText({
        chatId,
        messageId: progress.result.message_id,
        text: BOT_EXTRACT_CANCELLED,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  if (progress.ok) {
    await editMessageText({
      chatId,
      messageId: progress.result.message_id,
      text: isPhoto ? BOT_PROGRESS_DONE_PHOTO : BOT_PROGRESS_DONE_VOICE,
      replyMarkup: emptyKeyboard(),
    }).catch(() => undefined);
  }
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const cq = update.callback_query;
  if (!cq?.from || !cq.message) {
    if (cq) await answerCallbackQuery({ callbackQueryId: cq.id });
    return;
  }

  const telegramId = String(cq.from.id);
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const data = cq.data ?? "";

  if (cq.message.chat.type !== "private") {
    await answerCallbackQuery({
      callbackQueryId: cq.id,
      text: BOT_DENY_NON_PRIVATE,
      showAlert: true,
    });
    return;
  }

  const link = await lookupTelegramUser(telegramId);
  if (!link) {
    await answerCallbackQuery({
      callbackQueryId: cq.id,
      text: BOT_DENY_UNMAPPED,
      showAlert: true,
    });
    return;
  }

  await maybeAutoDiscardExpired(telegramId);

  // Cancel extract (progress message button) — only the active job's progress msg.
  if (data === CB_CANCEL_EXTRACT) {
    const session = await loadBotSession(telegramId);
    if (
      session?.phase === "extracting" &&
      session.progressMessageId === messageId
    ) {
      await clearBotSession(telegramId);
      await editMessageText({
        chatId,
        messageId,
        text: BOT_EXTRACT_CANCELLED,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: "Отменено",
      });
      return;
    }
    await answerCallbackQuery({
      callbackQueryId: cq.id,
      text: BOT_DRAFT_CLOSED,
      showAlert: true,
    });
    return;
  }

  const open = await loadBotSession(telegramId);
  if (
    !open?.draft ||
    open.cardMessageId !== messageId ||
    !isOpenDraftPhase(open.phase)
  ) {
    await answerCallbackQuery({
      callbackQueryId: cq.id,
      text: BOT_DRAFT_CLOSED,
      showAlert: true,
    });
    return;
  }

  if (data === CB_DISCARD) {
    // Exclusive claim so concurrent Commit cannot be overwritten by Discard UI.
    const claimed = await claimOpenBotSessionForCommit({
      telegramId,
      cardMessageId: messageId,
    });
    if (!claimed?.draft) {
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: BOT_DRAFT_CLOSED,
        showAlert: true,
      });
      return;
    }
    await editMessageText({
      chatId,
      messageId,
      text: BOT_DISCARDED,
      replyMarkup: emptyKeyboard(),
    });
    // Session already idle from claim; no second clear needed.
    await answerCallbackQuery({ callbackQueryId: cq.id, text: "Отброшено" });
    return;
  }

  if (data === CB_EDIT_AMOUNT) {
    await upsertBotSession({
      telegramId,
      phase: "awaiting_amount",
      draft: open.draft,
      cardChatId: open.cardChatId,
      cardMessageId: open.cardMessageId,
      categoryPage: open.categoryPage,
    });
    await answerCallbackQuery({ callbackQueryId: cq.id });
    await sendMessage({
      chatId,
      text: BOT_AWAITING_AMOUNT,
      replyMarkup: { force_reply: true, selective: true },
    });
    return;
  }

  if (data === CB_EDIT_OCCURRED_ON) {
    await upsertBotSession({
      telegramId,
      phase: "awaiting_occurred_on",
      draft: open.draft,
      cardChatId: open.cardChatId,
      cardMessageId: open.cardMessageId,
      categoryPage: open.categoryPage,
    });
    await answerCallbackQuery({ callbackQueryId: cq.id });
    await sendMessage({
      chatId,
      text: BOT_AWAITING_OCCURRED_ON,
      replyMarkup: { force_reply: true, selective: true },
    });
    return;
  }

  if (data === CB_EDIT_NOTE) {
    await upsertBotSession({
      telegramId,
      phase: "awaiting_note",
      draft: open.draft,
      cardChatId: open.cardChatId,
      cardMessageId: open.cardMessageId,
      categoryPage: open.categoryPage,
    });
    await answerCallbackQuery({ callbackQueryId: cq.id });
    await sendMessage({
      chatId,
      text: BOT_AWAITING_NOTE,
      replyMarkup: { force_reply: true, selective: true },
    });
    return;
  }

  if (data === CB_OPEN_CATEGORY || parseCategoryPage(data) !== null) {
    const page =
      data === CB_OPEN_CATEGORY ? 0 : (parseCategoryPage(data) as number);
    const categories = await loadVisibleCategoriesForUser(link.userId);
    await upsertBotSession({
      telegramId,
      phase: "confirm",
      draft: open.draft,
      cardChatId: open.cardChatId,
      cardMessageId: open.cardMessageId,
      categoryPage: page,
    });
    await editMessageText({
      chatId,
      messageId,
      text: "Выберите категорию:",
      replyMarkup: categoryPickerKeyboard({ categories, page }),
    });
    await answerCallbackQuery({ callbackQueryId: cq.id });
    return;
  }

  if (data === CB_CATEGORY_BACK) {
    await refreshCard({
      telegramId,
      userId: link.userId,
      draft: open.draft,
      cardChatId: chatId,
      cardMessageId: messageId,
      categoryPage: open.categoryPage,
    });
    await answerCallbackQuery({ callbackQueryId: cq.id });
    return;
  }

  const pickIndex = parseCategoryPick(data);
  if (pickIndex !== null) {
    const categories = await loadVisibleCategoriesForUser(link.userId);
    const picked = resolveCategoryByIndex(categories, pickIndex);
    if (!picked) {
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: "Категория недоступна.",
        showAlert: true,
      });
      return;
    }
    const draft: Draft = { ...open.draft, categoryId: picked.id };
    await refreshCard({
      telegramId,
      userId: link.userId,
      draft,
      cardChatId: chatId,
      cardMessageId: messageId,
      categoryPage: 0,
    });
    await answerCallbackQuery({
      callbackQueryId: cq.id,
      text: picked.displayName,
    });
    return;
  }

  if (data === CB_COMMIT) {
    // Field validation without claiming — keep Draft open on invalid Commit.
    const precheck = validateCommit(open.draft);
    if (!precheck.ok) {
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: commitAlert(precheck.reason),
        showAlert: true,
      });
      return;
    }

    // Exclusive claim before insert: concurrent Commit cannot both persist.
    const claimed = await claimOpenBotSessionForCommit({
      telegramId,
      cardMessageId: messageId,
    });
    if (!claimed?.draft) {
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: BOT_DRAFT_CLOSED,
        showAlert: true,
      });
      return;
    }

    const draft = claimed.draft;
    const result = await commitBotDraft({
      userId: link.userId,
      draft,
    });

    if (result.status !== "ok") {
      // Restore open Draft so the user can retry Commit (ADR-0008).
      // Conditional: if new media claimed the freed session during Commit,
      // do not overwrite its extractJobId / Draft (ADR-0010).
      if (claimed.commitClaimId) {
        await restoreBotSessionAfterFailedCommit({
          telegramId,
          phase: claimed.phase,
          draft,
          cardChatId: claimed.cardChatId,
          cardMessageId: claimed.cardMessageId,
          progressMessageId: claimed.progressMessageId,
          categoryPage: claimed.categoryPage,
          commitClaimId: claimed.commitClaimId,
        });
      }
      await answerCallbackQuery({
        callbackQueryId: cq.id,
        text: commitAlert(result.reason),
        showAlert: true,
      });
      return;
    }

    const categoryName = await loadCategoryName(
      link.userId,
      draft.categoryId,
    );
    const doneText = formatDraftCardText({
      draft,
      categoryName,
      footer: BOT_COMMITTED,
    });
    await editMessageText({
      chatId,
      messageId,
      text: doneText,
      replyMarkup: emptyKeyboard(),
    });
    // Session already idle from claim; no second clear needed.
    await answerCallbackQuery({ callbackQueryId: cq.id, text: "Записано" });
    return;
  }

  await answerCallbackQuery({ callbackQueryId: cq.id });
}

async function applyAmountReply(input: {
  telegramId: string;
  userId: string;
  chatId: number;
  session: BotSession;
  text: string;
}): Promise<void> {
  const amount = parseAmount(input.text);
  if (amount === null) {
    await sendMessage({ chatId: input.chatId, text: BOT_INVALID_AMOUNT });
    return;
  }
  const draft = {
    ...input.session.draft!,
    amount: amount.toFixed(2),
  };
  await refreshCard({
    telegramId: input.telegramId,
    userId: input.userId,
    draft,
    cardChatId: input.session.cardChatId!,
    cardMessageId: input.session.cardMessageId!,
    categoryPage: input.session.categoryPage,
  });
}

async function applyOccurredOnReply(input: {
  telegramId: string;
  userId: string;
  chatId: number;
  session: BotSession;
  text: string;
}): Promise<void> {
  const occurredOn = parseOccurredOnReply(input.text);
  if (!occurredOn) {
    await sendMessage({ chatId: input.chatId, text: BOT_INVALID_DATE });
    return;
  }
  const draft = {
    ...input.session.draft!,
    occurredOn,
  };
  await refreshCard({
    telegramId: input.telegramId,
    userId: input.userId,
    draft,
    cardChatId: input.session.cardChatId!,
    cardMessageId: input.session.cardMessageId!,
    categoryPage: input.session.categoryPage,
  });
}

async function applyNoteReply(input: {
  telegramId: string;
  userId: string;
  chatId: number;
  session: BotSession;
  text: string;
}): Promise<void> {
  // Empty reply clears Note (ADR-0010).
  if (isNoteTooLong(input.text)) {
    await sendMessage({ chatId: input.chatId, text: BOT_NOTE_TOO_LONG });
    return;
  }
  const note = input.text.trim();
  const draft = {
    ...input.session.draft!,
    note,
  };
  await refreshCard({
    telegramId: input.telegramId,
    userId: input.userId,
    draft,
    cardChatId: input.session.cardChatId!,
    cardMessageId: input.session.cardMessageId!,
    categoryPage: input.session.categoryPage,
  });
  // Card already edited; no extra ack (ADR-0010 confirm surface = card).
}

async function refreshCard(input: {
  telegramId: string;
  userId: string;
  draft: Draft;
  cardChatId: number;
  cardMessageId: number;
  categoryPage: number;
}): Promise<void> {
  const categoryName = await loadCategoryName(
    input.userId,
    input.draft.categoryId,
  );
  const cardText = formatDraftCardText({
    draft: input.draft,
    categoryName,
  });
  await editMessageText({
    chatId: input.cardChatId,
    messageId: input.cardMessageId,
    text: cardText,
    replyMarkup: draftCardKeyboard(),
  });
  await upsertBotSession({
    telegramId: input.telegramId,
    phase: "confirm",
    draft: input.draft,
    cardChatId: input.cardChatId,
    cardMessageId: input.cardMessageId,
    categoryPage: input.categoryPage,
  });
}

async function discardOpenDraft(
  telegramId: string,
  chatId: number,
): Promise<void> {
  const session = await loadBotSession(telegramId);
  if (session?.phase === "extracting") {
    await clearBotSession(telegramId);
    if (session.progressMessageId != null) {
      await editMessageText({
        chatId,
        messageId: session.progressMessageId,
        text: BOT_EXTRACT_CANCELLED,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    await sendMessage({ chatId, text: BOT_EXTRACT_CANCELLED });
    return;
  }

  if (!session || session.phase === "idle" || !session.draft) {
    await sendMessage({ chatId, text: BOT_NO_OPEN_DRAFT });
    return;
  }

  // Claim before rewriting the card so a concurrent Commit is not masked.
  if (session.cardMessageId != null) {
    const claimed = await claimOpenBotSessionForCommit({
      telegramId,
      cardMessageId: session.cardMessageId,
    });
    if (!claimed?.draft) {
      await sendMessage({ chatId, text: BOT_NO_OPEN_DRAFT });
      return;
    }
    if (claimed.cardChatId != null && claimed.cardMessageId != null) {
      await editMessageText({
        chatId: claimed.cardChatId,
        messageId: claimed.cardMessageId,
        text: BOT_DISCARDED,
        replyMarkup: emptyKeyboard(),
      });
    }
    await sendMessage({ chatId, text: BOT_DISCARDED });
    return;
  }

  await clearBotSession(telegramId);
  await sendMessage({ chatId, text: BOT_DISCARDED });
}

async function maybeAutoDiscardExpired(telegramId: string): Promise<void> {
  const session = await loadBotSession(telegramId);
  if (!session || !isBotSessionIdleExpired(session)) return;

  // Open Draft card: claim so concurrent Commit keeps its committed summary.
  if (
    isOpenDraftPhase(session.phase) &&
    session.draft &&
    session.cardMessageId != null
  ) {
    const claimed = await claimOpenBotSessionForCommit({
      telegramId,
      cardMessageId: session.cardMessageId,
    });
    if (!claimed) return;
    if (claimed.cardChatId != null && claimed.cardMessageId != null) {
      await editMessageText({
        chatId: claimed.cardChatId,
        messageId: claimed.cardMessageId,
        text: BOT_TIMEOUT_DISCARD,
        replyMarkup: emptyKeyboard(),
      }).catch(() => undefined);
    }
    return;
  }

  if (session.cardChatId != null && session.cardMessageId != null) {
    await editMessageText({
      chatId: session.cardChatId,
      messageId: session.cardMessageId,
      text: BOT_TIMEOUT_DISCARD,
      replyMarkup: emptyKeyboard(),
    }).catch(() => undefined);
  }
  await clearBotSession(telegramId);
}

function preCaptureCopy(
  reason:
    | "unsupported_type"
    | "photo_oversize"
    | "voice_oversize"
    | "voice_too_long"
    | "missing_file",
): string {
  switch (reason) {
    case "photo_oversize":
      return BOT_PHOTO_OVERSIZE;
    case "voice_oversize":
    case "voice_too_long":
      return BOT_VOICE_LIMIT;
    case "missing_file":
      return BOT_PRECAPTURE_FAIL;
    default:
      return BOT_UNSUPPORTED_MEDIA;
  }
}

function commitAlert(reason: string): string {
  switch (reason) {
    case "amount_required":
      return "Укажите сумму > 0 (кнопка «Сумма»).";
    case "category_required":
      return "Нужна категория.";
    case "date_required":
      return "Некорректная дата.";
    case "note_too_long":
      return "Заметка слишком длинная.";
    case "amount_too_large":
      return "Сумма слишком большая.";
    default:
      return "Не удалось записать. Попробуйте ещё раз.";
  }
}

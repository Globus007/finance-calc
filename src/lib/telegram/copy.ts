/**
 * User-facing RU copy (ADR-0009 deny matrix + ADR-0010/0011 bot UX).
 */

/** Mini App residual: telegram_id not in mapping store. */
export const TG_DENY_UNMAPPED =
  "Доступ из Telegram не настроен для этого аккаунта. Связь telegram_id задаёт оператор (не email-вход внутри Telegram).";

/** Mini App residual: invalid or stale initData. */
export const TG_DENY_STALE =
  "Сессия Telegram устарела или данные недействительны. Закройте Mini App и откройте снова.";

/** Mini App residual: session mint / server failure. */
export const TG_DENY_MINT =
  "Не удалось войти. Попробуйте позже или откройте Mini App снова.";

/** Mini App residual: env not configured on server. */
export const TG_DENY_NOT_CONFIGURED =
  "Telegram-вход временно недоступен (сервер не настроен).";

/** Bot: unmapped telegram_id. */
export const BOT_DENY_UNMAPPED =
  "Нет доступа. Этот Telegram-аккаунт не связан с finance-calc.";

/** Bot: non-private chat. */
export const BOT_DENY_NON_PRIVATE =
  "Бот принимает фото и голосовые только в личном чате.";

/** Bot: help /start. */
export const BOT_HELP =
  "Отправьте фото чека или голосовое сообщение — подготовлю черновик расхода в чате.\n" +
  "Кнопки: Записать / Отбросить; правка суммы, даты, категории, заметки.\n" +
  "Доходы, ручной ввод и обзор — в веб-приложении (PWA).";

/** Bot: wrong media type. */
export const BOT_UNSUPPORTED_MEDIA =
  "Пришлите фото чека или голосовое сообщение. Документы, файлы и видео здесь не принимаются.";

/** Bot: photo oversize pre-capture. */
export const BOT_PHOTO_OVERSIZE =
  "Фото слишком большое (макс. 5 МБ). Пришлите другое фото.";

/** Bot: voice oversize / too long pre-capture. */
export const BOT_VOICE_LIMIT =
  "Голосовое слишком длинное или большое (макс. ~60 с / 2 МБ). Запишите короче.";

/** Bot: getFile / download / upload failure (pre-capture). */
export const BOT_PRECAPTURE_FAIL =
  "Не удалось получить файл. Пришлите фото или голос ещё раз.";

/** Bot: extraction failure — recapture only. */
export const BOT_EXTRACTION_FAILURE_PHOTO =
  "Не удалось разобрать чек. Пришлите новое фото (повторить тот же файл нельзя).";

export const BOT_EXTRACTION_FAILURE_VOICE =
  "Не удалось разобрать запись. Пришлите новое голосовое (повторить тот же файл нельзя).";

/** Bot: second media while extract in flight. */
export const BOT_WAIT_OR_CANCEL =
  "Идёт обработка. Подождите или нажмите «Отмена».";

/** Bot: extract cancelled (no Draft). */
export const BOT_EXTRACT_CANCELLED = "Обработка отменена. Черновик не создан.";

/** Bot: while awaiting amount reply. */
export const BOT_AWAITING_AMOUNT =
  "Введите сумму в BYN (например 12,50) или Отбросить на карточке.";

/** Bot: while awaiting occurred-on reply. */
export const BOT_AWAITING_OCCURRED_ON =
  "Введите дату: ГГГГ-ММ-ДД, Д.М.ГГГГ, «сегодня» или «вчера».";

/** Bot: while awaiting note reply. */
export const BOT_AWAITING_NOTE =
  "Введите заметку (пустой ответ очистит) или Отбросить на карточке.";

/** Bot: invalid field parse. */
export const BOT_INVALID_AMOUNT = "Не понял сумму. Пример: 12,50";
export const BOT_INVALID_DATE =
  "Не понял дату. Пример: 10.08.2026, сегодня, вчера.";
export const BOT_NOTE_TOO_LONG = "Заметка слишком длинная (макс. 500 символов).";

/** Bot: no open draft for /discard. */
export const BOT_NO_OPEN_DRAFT = "Нет открытого черновика.";

/** Bot: unrecognized free text. */
export const BOT_HINT_TEXT =
  "Отправьте фото или голосовое, либо /help. Ручной ввод — в PWA.";

/** Bot: commit success footer on card. */
export const BOT_COMMITTED = "Записано.";

/** Bot: discarded. */
export const BOT_DISCARDED = "Черновик отброшен.";

/** Bot: 24h idle auto-Discard. */
export const BOT_TIMEOUT_DISCARD =
  "Черновик сброшен: не было действий более 24 часов.";

/** Bot: draft closed (stale callback). */
export const BOT_DRAFT_CLOSED = "Черновик уже закрыт.";

/** Bot: progress messages. */
export const BOT_PROGRESS_PHOTO = "Обрабатываю фото…";
export const BOT_PROGRESS_VOICE = "Обрабатываю голосовое…";
export const BOT_PROGRESS_DONE_PHOTO = "Фото обработано.";
export const BOT_PROGRESS_DONE_VOICE = "Голосовое обработано.";

/** Bot: categories missing. */
export const BOT_CATEGORIES_MISSING =
  "Не найдены категории пользователя. Проверьте seed Categories.";

/**
 * Russian copy for capture shells (ADR-0008).
 * Pre-capture vs Extraction failure are distinct modes.
 */

export type PhotoPreCaptureReason =
  | "permission"
  | "type"
  | "size"
  | "offline"
  | "unavailable";

export const PHOTO_PRE_CAPTURE_MESSAGES: Record<
  PhotoPreCaptureReason,
  { title: string; body: string; primaryCta: string }
> = {
  permission: {
    title: "Нет доступа к камере",
    body: "Разрешите доступ к камере в настройках браузера или выберите фото из галереи.",
    primaryCta: "Выбрать фото",
  },
  type: {
    title: "Неподдерживаемый формат",
    body: "Нужен JPEG, PNG или WebP. Выберите другое фото.",
    primaryCta: "Выбрать другое",
  },
  size: {
    title: "Файл слишком большой",
    body: "Чек должен быть не больше 5 МБ после сжатия. Сделайте другое фото.",
    primaryCta: "Сделать новое фото",
  },
  offline: {
    title: "Нет сети",
    body: "Для загрузки чека нужен интернет. Подключитесь и попробуйте снова.",
    primaryCta: "Повторить",
  },
  unavailable: {
    title: "Камера недоступна",
    body: "Не удалось открыть камеру на этом устройстве. Выберите фото из галереи.",
    primaryCta: "Выбрать фото",
  },
};

/** Generic Extraction failure — no provider codes (ADR-0008). */
export const PHOTO_EXTRACTION_FAILURE = {
  title: "Не удалось распознать чек",
  body: "Сделайте новое фото. Повтор той же картинки недоступен.",
  primaryCta: "Новое фото",
} as const;

export const PHOTO_PROGRESS_LABEL = "Распознаём чек…";

export const PHOTO_CANCEL_LABEL = "Отмена";

/** Voice pre-capture reasons (ADR-0008). */
export type VoicePreCaptureReason =
  | "permission"
  | "type"
  | "size"
  | "offline"
  | "unavailable"
  | "insecure";

export const VOICE_PRE_CAPTURE_MESSAGES: Record<
  VoicePreCaptureReason,
  { title: string; body: string; primaryCta: string }
> = {
  permission: {
    title: "Нет доступа к микрофону",
    body: "Разрешите доступ к микрофону в настройках браузера и попробуйте снова.",
    primaryCta: "Повторить",
  },
  type: {
    title: "Неподдерживаемый формат",
    body: "Запись в этом формате недоступна. Попробуйте другой браузер.",
    primaryCta: "Повторить",
  },
  size: {
    title: "Запись слишком длинная",
    body: "Голосовая запись должна быть не больше 2 МБ (~60 с). Запишите короче.",
    primaryCta: "Новая запись",
  },
  offline: {
    title: "Нет сети",
    body: "Для распознавания голоса нужен интернет. Подключитесь и попробуйте снова.",
    primaryCta: "Повторить",
  },
  unavailable: {
    title: "Микрофон недоступен",
    body: "Не удалось открыть микрофон на этом устройстве.",
    primaryCta: "Повторить",
  },
  insecure: {
    title: "Нужен безопасный сайт",
    body: "Запись голоса работает только по HTTPS (или localhost).",
    primaryCta: "Понятно",
  },
};

/** Generic Extraction failure for voice — recapture without auto-mic (ADR-0008). */
export const VOICE_EXTRACTION_FAILURE = {
  title: "Не удалось распознать запись",
  body: "Сделайте новую запись. Повтор той же записи недоступен.",
  primaryCta: "Новая запись",
} as const;

export const VOICE_PROGRESS_LABEL = "Распознаём голос…";

export const VOICE_CANCEL_LABEL = "Отмена";

export const VOICE_READY_TITLE = "Голосовая запись";

export const VOICE_READY_BODY =
  "Нажмите «Записать» и коротко скажите сумму и контекст (расход или доход). До ~60 секунд.";

export const VOICE_RECORD_CTA = "Записать";

export const VOICE_STOP_CTA = "Стоп";

export const VOICE_RECORDING_LABEL = "Идёт запись…";

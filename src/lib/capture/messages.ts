/**
 * Russian copy for photo capture shell (ADR-0008).
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

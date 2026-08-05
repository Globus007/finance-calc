import type { CommitRejection } from "./validate-commit";

type CommitActionError =
  | CommitRejection
  | "unauthenticated"
  | "unavailable"
  | "category_not_found"
  | "category_hidden";

const MESSAGES: Record<CommitActionError, string> = {
  amount_required: "Укажите сумму больше нуля.",
  date_required: "Укажите дату.",
  category_required: "Выберите категорию.",
  note_too_long: "Заметка не длиннее 500 символов.",
  invalid_channel_for_kind: "Недопустимый способ захвата для этой записи.",
  unauthenticated: "Войдите в аккаунт, чтобы сохранить запись.",
  unavailable: "Не удалось сохранить. Попробуйте ещё раз.",
  category_not_found: "Категория не найдена. Выберите другую.",
  category_hidden: "Эта категория скрыта. Выберите видимую категорию.",
};

export function commitErrorMessage(reason: CommitActionError): string {
  return MESSAGES[reason] ?? MESSAGES.unavailable;
}

export type { CommitActionError };

import type { TransferActionError } from "./types";

const MESSAGES: Record<TransferActionError, string> = {
  amount_required: "Укажите сумму перевода больше нуля.",
  amount_too_large: "Сумма не больше 9 999 999 999,99.",
  date_required: "Укажите корректную дату.",
  note_too_long: "Заметка не длиннее 500 символов.",
  same_account: "Выберите два разных счёта.",
  account_not_found: "Счёт не найден. Обновите список счетов.",
  rate_unavailable:
    "Курс для этой пары валют недоступен. Задайте курс в Настройках.",
  unauthenticated: "Войдите в аккаунт, чтобы записать перевод.",
  unavailable: "Не удалось сохранить перевод. Попробуйте ещё раз.",
  not_found: "Перевод не найден.",
};

export function transferErrorMessage(reason: TransferActionError): string {
  return MESSAGES[reason] ?? MESSAGES.unavailable;
}

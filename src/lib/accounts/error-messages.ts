import type { AccountActionError } from "./types";

const MESSAGES: Record<AccountActionError, string> = {
  unauthenticated: "Войдите в аккаунт, чтобы управлять счетами.",
  unavailable: "Не удалось сохранить. Попробуйте ещё раз.",
  not_found: "Счёт не найден.",
  name_required: "Укажите название счёта.",
  name_too_long: "Название не длиннее 40 символов.",
  currency_invalid: "Доступны BYN, USD и EUR.",
  currency_immutable: "Валюту счёта изменить нельзя — создайте новый счёт.",
  last_account: "Должен остаться хотя бы один счёт.",
  not_empty: "На этом счёте есть записи — удалите их или создайте новый счёт.",
};

export function accountActionErrorMessage(reason: AccountActionError): string {
  return MESSAGES[reason] ?? MESSAGES.unavailable;
}

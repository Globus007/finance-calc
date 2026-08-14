import type { SetOpeningRejection } from "./types";

export type SetOpeningActionError =
  | SetOpeningRejection
  | "unauthenticated"
  | "unavailable";

const MESSAGES: Record<SetOpeningActionError, string> = {
  amount_required: "Укажите сумму старта — ноль можно, минус нельзя.",
  amount_negative: "Сумма старта не может быть отрицательной.",
  amount_too_large: "Сумма не больше 9 999 999 999,99.",
  date_required: "Укажите корректную дату старта.",
  date_after_tomorrow: "Дата старта не позже завтра.",
  unauthenticated: "Войдите в аккаунт, чтобы задать старт.",
  unavailable: "Не удалось сохранить старт. Попробуйте ещё раз.",
};

export function setOpeningErrorMessage(reason: SetOpeningActionError): string {
  return MESSAGES[reason] ?? MESSAGES.unavailable;
}

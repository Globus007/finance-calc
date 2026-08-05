import type { MutationRejection } from "./lifecycle";

type ActionErrorReason =
  | MutationRejection
  | "unauthenticated"
  | "not_found"
  | "unavailable";

const MESSAGES: Record<ActionErrorReason, string> = {
  forbidden_system_fallback:
    "«Прочее» — системная категория: её нельзя скрыть, переименовать или удалить.",
  forbidden_seed:
    "Базовые категории нельзя переименовать или удалить. Можно только скрыть.",
  in_use:
    "Нельзя удалить: есть расходы с этой категорией. Сначала смените категорию у записей.",
  invalid_name: "Введите название категории.",
  name_too_long: "Название не длиннее 80 символов.",
  duplicate_name: "Категория с таким названием уже есть.",
  unauthenticated: "Войдите в аккаунт, чтобы управлять категориями.",
  not_found: "Категория не найдена.",
  unavailable: "Не удалось выполнить действие. Попробуйте ещё раз.",
};

export function categoryActionErrorMessage(reason: ActionErrorReason): string {
  return MESSAGES[reason] ?? MESSAGES.unavailable;
}

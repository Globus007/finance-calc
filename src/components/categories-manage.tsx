"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryHidden,
  type CategoryActionResult,
} from "@/app/(app)/categories/actions";
import { IconArrowLeft } from "@/components/icons";
// bundle-barrel-imports: direct modules only
import { MAX_CATEGORY_DISPLAY_NAME_LENGTH } from "@/lib/categories/display-name";
import { categoryActionErrorMessage } from "@/lib/categories/error-messages";
import type { CategoryManageItem } from "@/lib/categories/types";

type Props = {
  initialCategories: CategoryManageItem[];
};

export function CategoriesManage({ initialCategories }: Props) {
  const router = useRouter();
  // rendering-usetransition-loading / rerender-transitions
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function runAction(action: () => Promise<CategoryActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "ok") {
        setNewName("");
        setRenamingId(null);
        setRenameValue("");
        router.refresh();
        return;
      }
      setError(categoryActionErrorMessage(result.reason));
    });
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    runAction(() => createCategory(newName));
  }

  return (
    <div className="ui-page">
      <Link href="/" className="ui-back">
        <IconArrowLeft size={14} /> Назад
      </Link>
      <h1 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em]">Категории</h1>
      <p className="mt-1 text-xs text-ink-muted">
        Скрытые не показываются в выборе для новых расходов. «Прочее» — системная
        категория по умолчанию.
      </p>

      {error !== null ? (
        <p
          role="alert"
          className="mt-3 rounded-control bg-expense-soft px-3 py-2 text-sm text-[#C44822]"
        >
          {error}
        </p>
      ) : null}

      <form onSubmit={onCreate} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="new-category-name">
          Новая категория
        </label>
        <input
          id="new-category-name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Своя категория"
          maxLength={MAX_CATEGORY_DISPLAY_NAME_LENGTH}
          disabled={isPending}
          className="ui-field min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={isPending || newName.trim().length === 0}
          className="ui-btn-primary w-auto shrink-0 px-4 py-2.5"
        >
          Добавить
        </button>
      </form>

      <ul className="mt-4 space-y-2" aria-label="Список категорий">
        {initialCategories.map((c) => (
          <CategoryManageRow
            key={c.id}
            category={c}
            isPending={isPending}
            isRenaming={renamingId === c.id}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onStartRename={() => {
              setError(null);
              setRenamingId(c.id);
              setRenameValue(c.displayName);
            }}
            onCancelRename={() => {
              setRenamingId(null);
              setRenameValue("");
            }}
            onSubmitRename={() =>
              runAction(() => renameCategory(c.id, renameValue))
            }
            onHide={() => runAction(() => setCategoryHidden(c.id, true))}
            onUnhide={() => runAction(() => setCategoryHidden(c.id, false))}
            onDelete={() => {
              if (
                !window.confirm(`Удалить категорию «${c.displayName}»?`)
              ) {
                return;
              }
              runAction(() => deleteCategory(c.id));
            }}
          />
        ))}
      </ul>

      {initialCategories.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink-muted">
          Категории появятся после входа. Если список пуст, обновите страницу.
        </p>
      ) : null}
    </div>
  );
}

/** Module-level row (rerender-no-inline-components). */
function CategoryManageRow({
  category: c,
  isPending,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onSubmitRename,
  onHide,
  onUnhide,
  onDelete,
}: {
  category: CategoryManageItem;
  isPending: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSubmitRename: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
}) {
  const originLabel = c.isSystemFallback
    ? "системная"
    : c.origin === "seed"
      ? "базовая"
      : "своя";

  return (
    <li className="ui-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitRename();
              }}
            >
              <label className="sr-only" htmlFor={`rename-${c.id}`}>
                Новое название
              </label>
              <input
                id={`rename-${c.id}`}
                type="text"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                maxLength={MAX_CATEGORY_DISPLAY_NAME_LENGTH}
                disabled={isPending}
                autoFocus
                className="ui-field"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs font-semibold text-brand"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onCancelRename}
                  className="text-xs font-semibold text-ink-muted"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <>
              <p
                className={`text-sm font-semibold ${
                  c.isHidden ? "opacity-40 line-through" : ""
                }`}
              >
                {c.displayName}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                {originLabel}
                {c.isHidden ? " · скрыта" : ""}
                {c.isInUse && c.origin === "user" ? " · в расходах" : ""}
              </p>
            </>
          )}
        </div>

        {isRenaming ? null : (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {c.canHide ? (
              <ActionButton disabled={isPending} onClick={onHide}>
                Скрыть
              </ActionButton>
            ) : null}
            {c.canUnhide ? (
              <ActionButton disabled={isPending} onClick={onUnhide}>
                Показать
              </ActionButton>
            ) : null}
            {c.canRename ? (
              <ActionButton disabled={isPending} onClick={onStartRename}>
                Переименовать
              </ActionButton>
            ) : null}
            {c.canDelete ? (
              <ActionButton disabled={isPending} danger onClick={onDelete}>
                Удалить
              </ActionButton>
            ) : null}
            {c.origin === "user" && !c.canDelete && c.isInUse ? (
              <span className="text-[10px] text-ink-muted">
                Удаление недоступно
              </span>
            ) : null}
            {c.isSystemFallback ? (
              <span className="text-[10px] text-ink-muted">
                Нельзя изменить
              </span>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-xs font-medium disabled:opacity-40 ${
        danger ? "text-[#C44822]" : "text-brand"
      }`}
    >
      {children}
    </button>
  );
}

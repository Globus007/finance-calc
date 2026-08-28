"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAccountAction,
  deleteAccountAction,
  renameAccountAction,
  setDefaultAccountAction,
} from "@/app/(app)/settings/actions";
import { accountActionErrorMessage } from "@/lib/accounts/error-messages";
import type { Account, AccountActionError } from "@/lib/accounts/types";
import { currencyLabel } from "@/lib/money/display";
import type { Currency } from "@/lib/fx";

type Props = {
  accounts: Account[];
};

const CURRENCIES: Currency[] = ["BYN", "USD", "EUR"];

/**
 * Settings «Счета» section (story #12): list, create, rename, set default,
 * delete-only-when-empty. The default till receives fast capture.
 */
export function AccountsManage({ accounts }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("BYN");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lastAccount = accounts.length <= 1;

  function run(
    action: () => Promise<{ status: string; reason?: AccountActionError }>,
    afterOk: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "ok") {
        afterOk();
        router.refresh();
        return;
      }
      setError(accountActionErrorMessage(result.reason ?? "unavailable"));
    });
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isPending || !name.trim()) return;
    run(
      () => createAccountAction({ name, currency }),
      () => {
        setName("");
        setCreating(false);
      },
    );
  }

  function onRename(id: string) {
    if (isPending || !renameValue.trim()) return;
    run(() => renameAccountAction({ id, name: renameValue }), () => {
      setRenamingId(null);
      setRenameValue("");
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("Удалить этот счёт? Сделать это можно, только если на нём нет записей.")) {
      return;
    }
    run(() => deleteAccountAction({ id }), () => undefined);
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="ui-kicker">Счета</p>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">
        У каждого счёта своя валюта. Расходы и доходы записываются на один счёт;
        быстрый захват (фото, голос, бот) идёт на основной счёт.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-control bg-expense-soft px-3 py-2 text-sm text-expense"
        >
          {error}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2" aria-label="Список счетов">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex min-w-0 items-center gap-2 rounded-2xl bg-surface px-3 py-2.5"
          >
            {renamingId === account.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  aria-label="Название счёта"
                  className="ui-field min-w-0 flex-1 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRename(account.id)}
                  disabled={isPending}
                  className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {account.name}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {currencyLabel(account.currency)}
                  {account.isDefault ? " · основной" : ""}
                </p>
              </div>
            )}

            {renamingId !== account.id ? (
              <div className="flex shrink-0 items-center gap-1">
                {!account.isDefault ? (
                  <button
                    type="button"
                    onClick={() =>
                      run(() => setDefaultAccountAction({ id: account.id }), () => undefined)
                    }
                    disabled={isPending}
                    aria-label={`Сделать «${account.name}» основным`}
                    title="Сделать основным"
                    className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-bold text-brand transition hover:bg-brand-soft active:scale-95 disabled:opacity-40"
                  >
                    Основным
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(account.id);
                    setRenameValue(account.name);
                    setError(null);
                  }}
                  disabled={isPending}
                  aria-label={`Переименовать «${account.name}»`}
                  className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-ink active:scale-95 disabled:opacity-40"
                >
                  Переименовать
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(account.id)}
                  disabled={isPending || lastAccount}
                  aria-label={`Удалить «${account.name}»`}
                  title={lastAccount ? "Должен остаться хотя бы один счёт" : "Удалить (только пустой)"}
                  className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold text-expense transition hover:bg-expense-soft active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Удалить
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {creating ? (
        <form
          onSubmit={onCreate}
          className="mt-3 flex flex-wrap items-end gap-2"
          noValidate
        >
          <label className="min-w-0 flex-1 basis-40">
            <span className="text-[12px] font-medium text-ink-muted">Название</span>
            <input
              value={name}
              onChange={(e) => {
                setError(null);
                setName(e.target.value);
              }}
              autoFocus
              placeholder="Например, Наличные"
              aria-label="Название нового счёта"
              className="ui-field mt-1 w-full text-sm"
            />
          </label>
          <label className="shrink-0">
            <span className="text-[12px] font-medium text-ink-muted">Валюта</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              aria-label="Валюта нового счёта"
              className="ui-field mt-1"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="ui-btn-primary shrink-0 px-4 py-2.5 text-sm"
          >
            Создать
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            disabled={isPending}
            className="shrink-0 rounded-control px-3 py-2.5 text-sm font-semibold text-ink-muted"
          >
            Отмена
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={isPending}
          className="mt-3 w-full cursor-pointer rounded-control bg-surface-strong py-3 text-sm font-bold text-brand ring-1 ring-brand/25 transition hover:bg-brand-soft active:scale-[0.99] disabled:opacity-40"
        >
          + Добавить счёт
        </button>
      )}

      <p className="mt-3 text-[11px] leading-snug text-ink-muted">
        Валюту счёта изменить нельзя — создайте новый счёт. Удалить можно только
        пустой счёт, и всегда остаётся хотя бы один.
      </p>
    </div>
  );
}

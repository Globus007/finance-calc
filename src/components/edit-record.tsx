"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCommittedRecord,
  editCommittedRecord,
  type DeleteRecordResult,
  type EditRecordInput,
  type EditRecordResult,
} from "@/app/(app)/history/actions";
import { IconArrowLeft } from "@/components/icons";
import type { Account } from "@/lib/accounts/types";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Draft } from "@/lib/draft/types";
import { MAX_NOTE_LENGTH } from "@/lib/draft/normalize-note";
import { canCommit } from "@/lib/draft/validate-commit";
import { convertAmount, type RateMap } from "@/lib/fx/client";
import {
  deleteErrorMessage,
  editErrorMessage,
} from "@/lib/money/error-messages";
import { currencyLabel } from "@/lib/money/display";
import type { EditableRecord } from "@/lib/money/edit-types";
import { formatAmountInput } from "@/lib/money/format-amount-input";
import { channelLabelRu } from "@/lib/money/channel-label";

type Props = {
  record: EditableRecord;
  categories: CategoryPickerItem[];
  /** Accounts the record may move to (default first). */
  accounts: Account[];
  /** Rates behind the «≈» prefill on an Account change (ADR-0014). */
  rates: RateMap;
  /** Injectable for tests. */
  editFn?: (input: EditRecordInput) => Promise<EditRecordResult>;
  deleteFn?: (
    kind: "expense" | "income",
    id: string,
  ) => Promise<DeleteRecordResult>;
};

/** The Account the form currently edits against. */
export function currentAccount(
  accounts: Account[],
  accountId: string | null | undefined,
): Account | undefined {
  return (
    accounts.find((a) => a.id === accountId) ??
    accounts.find((a) => a.isDefault) ??
    accounts[0]
  );
}

/** Initial typed amount text: a $/€ record reopens in the Currency it remembers. */
function initialAmount(record: EditableRecord, account: Account | undefined): string {
  if (record.snapshot && record.snapshot.currency === account?.currency) {
    return formatAmountInput(record.snapshot.originalAmount);
  }
  // Canonical BYN is the honest figure for a BYN till (legacy $ rows included).
  return formatAmountInput(record.amount);
}

/**
 * Edit / Delete form for one committed Expense or Income.
 * Not a Draft: Channel and kind are shown read-only and never sent as mutable.
 * Moving the record to another Account keeps the Amount when the Currencies
 * match and prefills the converted figure («≈») when they differ (story #11).
 */
export function EditRecord({
  record,
  categories,
  accounts,
  rates,
  editFn = editCommittedRecord,
  deleteFn = deleteCommittedRecord,
}: Props) {
  const router = useRouter();
  const initial = currentAccount(accounts, record.accountId);
  const [accountId, setAccountId] = useState(initial?.id ?? record.accountId ?? "");
  const account = currentAccount(accounts, accountId);
  const currency = account?.currency ?? "BYN";
  const [amount, setAmount] = useState(() => initialAmount(record, initial));
  const [occurredOn, setOccurredOn] = useState(record.occurredOn);
  const [categoryId, setCategoryId] = useState(record.categoryId ?? "");
  const [note, setNote] = useState(record.note ?? "");
  const [convertedHint, setConvertedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Channel stand-in for canCommit only; form never edits provenance.
  const draftShape: Draft = {
    kind: record.kind,
    channel: record.kind === "income" ? "manual" : record.channel,
    amount,
    occurredOn,
    categoryId,
    note,
    accountId,
    currency,
  };
  const ready = canCommit(draftShape);

  function onAccountChange(nextId: string) {
    setError(null);
    setConvertedHint(null);
    const next = accounts.find((a) => a.id === nextId);
    const previous = account;
    setAccountId(nextId);
    if (!next || !previous || next.currency === previous.currency) return;

    const typed = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(typed) || typed <= 0) return;

    const converted = convertAmount(typed, previous.currency, next.currency, rates);
    if (converted === null) {
      setConvertedHint(
        `Курс ${currencyLabel(next.currency)} недоступен — сумма осталась как введена.`,
      );
      return;
    }
    setAmount(formatAmountInput(converted));
    setConvertedHint(`≈ пересчитано в ${next.name}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await editFn({
        id: record.id,
        kind: record.kind,
        amount,
        occurredOn,
        categoryId,
        note,
        accountId,
      });

      if (result.status === "ok") {
        router.push("/history");
        router.refresh();
        return;
      }
      setError(editErrorMessage(result.reason));
    });
  }

  function onDelete() {
    const label = record.kind === "expense" ? "расход" : "доход";
    if (!window.confirm(`Удалить этот ${label}?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteFn(record.kind, record.id);
      if (result.status === "ok") {
        router.push("/history");
        router.refresh();
        return;
      }
      setError(deleteErrorMessage(result.reason));
    });
  }

  const title =
    record.kind === "expense" ? "Редактирование расхода" : "Редактирование дохода";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3">
        <Link href="/history" className="ui-back">
          <IconArrowLeft size={14} /> История
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2">
          <h1 className="text-[1.55rem] font-bold tracking-[-0.04em]">{title}</h1>
          <p className="mt-1 text-xs text-ink-muted">
            Способ: {channelLabelRu(record.channel)} · не меняется
          </p>

          {error !== null ? (
            <p
              role="alert"
              className="mt-3 rounded-control bg-expense-soft px-3 py-2 text-sm text-[#C44822]"
            >
              {error}
            </p>
          ) : null}

          {accounts.length > 1 ? (
            <label className="mt-3 block">
              <span className="ui-kicker">Счёт</span>
              <select
                name="accountId"
                value={accountId}
                onChange={(e) => onAccountChange(e.target.value)}
                className="ui-field mt-1.5"
                aria-label="Счёт"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {currencyLabel(a.currency)}
                  </option>
                ))}
              </select>
              {convertedHint ? (
                <span className="mt-1 block text-[11px] text-ink-muted">
                  {convertedHint}
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <span className="ui-kicker">Сумма · {currencyLabel(currency)}</span>
              {account?.isDefault ? (
                <span className="shrink-0 rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                  основной
                </span>
              ) : null}
            </div>
            <input
              name="amount"
              value={amount}
              onChange={(e) => {
                setError(null);
                setAmount(e.target.value);
              }}
              inputMode="decimal"
              autoComplete="off"
              aria-label="Сумма"
              className="mt-1.5 w-full border-0 bg-transparent p-0 text-xl font-bold tabular-nums outline-none"
              aria-required
            />
            {currency !== "BYN" ? (
              <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                BYN пересчитается по курсу на момент сохранения
              </p>
            ) : null}
          </div>

          <label className="mt-3 block">
            <span className="ui-kicker">Дата</span>
            <input
              name="occurredOn"
              type="date"
              value={occurredOn}
              onChange={(e) => {
                setError(null);
                setOccurredOn(e.target.value);
              }}
              className="ui-field mt-1.5"
              aria-required
            />
          </label>

          {record.kind === "expense" ? (
            <label className="mt-3 block">
              <span className="ui-kicker">Категория</span>
              <select
                name="categoryId"
                value={categoryId}
                onChange={(e) => {
                  setError(null);
                  setCategoryId(e.target.value);
                }}
                className="ui-field mt-1.5"
                aria-required
              >
                <option value="">Выберите…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mt-3 block">
            <span className="ui-kicker">Заметка</span>
            <input
              name="note"
              value={note}
              onChange={(e) => {
                setError(null);
                setNote(e.target.value);
              }}
              maxLength={MAX_NOTE_LENGTH}
              className="ui-field mt-1.5"
            />
          </label>
        </div>

        <div className="space-y-2 px-4 pb-5 pt-2">
          <button
            type="submit"
            disabled={!ready || isPending}
            className="ui-btn-primary w-full py-3.5"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="w-full cursor-pointer rounded-control bg-surface-strong py-3.5 text-sm font-bold text-[#C44822] ring-1 ring-expense/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      </form>
    </div>
  );
}

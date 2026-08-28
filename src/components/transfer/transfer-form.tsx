"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTransfer,
  type TransferResult,
} from "@/app/(app)/transfer/actions";
import type { Account } from "@/lib/accounts/types";
import { crossRate, type RateMap } from "@/lib/fx/client";
import { MAX_NOTE_LENGTH } from "@/lib/draft/normalize-note";
import { currencyLabel } from "@/lib/money/display";
import { formatMoney } from "@/lib/money/format";
import { transferErrorMessage } from "@/lib/transfers/error-messages";
import type { TransferInput } from "@/lib/transfers/types";

type Props = {
  accounts: Account[];
  rates: RateMap;
  today: string;
  /** Editable fields (Edit of a committed Transfer). */
  initial?: {
    sourceAccountId?: string;
    targetAccountId?: string;
    amount?: string;
    movedOn?: string;
    note?: string;
  };
  title: string;
  /** Injectable for tests; defaults to the create Transfer action. */
  submitFn?: (input: TransferInput) => Promise<TransferResult>;
  /** Rendered by the Edit surface; create has none. */
  footer?: React.ReactNode;
  /** Where to go after a successful save. */
  redirectTo?: string;
};

/**
 * Transfer form: a direct user action between own Accounts (ADR-0014), never
 * Draft → Commit. Amount is typed in the source Account's Currency; the target
 * figure previews the conversion at the rate effective now.
 */
export function TransferForm({
  accounts,
  rates,
  today,
  initial,
  title,
  submitFn = createTransfer,
  footer = null,
  redirectTo = "/history",
}: Props) {
  const router = useRouter();
  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];
  const [sourceAccountId, setSourceAccountId] = useState(
    initial?.sourceAccountId ?? defaultAccount?.id ?? "",
  );
  const [targetAccountId, setTargetAccountId] = useState(
    initial?.targetAccountId ?? otherAccountId(accounts, initial?.sourceAccountId) ?? "",
  );
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [movedOn, setMovedOn] = useState(initial?.movedOn ?? today);
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const source = accounts.find((a) => a.id === sourceAccountId);
  const target = accounts.find((a) => a.id === targetAccountId);
  const sameAccount =
    !!sourceAccountId && sourceAccountId === targetAccountId;

  const typed = parseTypedAmount(amount);
  const rate =
    source && target && !sameAccount
      ? crossRate(source.currency, target.currency, rates)
      : null;
  const preview =
    typed !== null && rate !== null && target
      ? formatMoney(typed * rate, target.currency)
      : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending || sameAccount) return;

    setError(null);
    startTransition(async () => {
      const result = await submitFn({
        sourceAccountId,
        targetAccountId,
        amount,
        movedOn,
        note,
      });

      if (result.status === "ok") {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      setError(transferErrorMessage(result.reason));
    });
  }

  if (accounts.length < 2) {
    return (
      <div className="ui-page">
        <h1 className="text-[1.55rem] font-bold tracking-[-0.04em]">{title}</h1>
        <p className="ui-empty mt-4">
          Перевод нужен между двумя счетами. Создайте второй счёт в Настройках.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="ui-kicker">Откуда</span>
          <select
            name="sourceAccountId"
            value={sourceAccountId}
            onChange={(e) => {
              const next = e.target.value;
              setError(null);
              setSourceAccountId(next);
              if (next === targetAccountId) {
                setTargetAccountId(
                  otherAccountId(accounts, next) ?? targetAccountId,
                );
              }
            }}
            className="ui-field mt-1.5"
            aria-label="Счёт-источник"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {currencyLabel(a.currency)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="ui-kicker">Куда</span>
          <select
            name="targetAccountId"
            value={targetAccountId}
            onChange={(e) => {
              const next = e.target.value;
              setError(null);
              setTargetAccountId(next);
              if (next === sourceAccountId) {
                setSourceAccountId(
                  otherAccountId(accounts, next) ?? sourceAccountId,
                );
              }
            }}
            className="ui-field mt-1.5"
            aria-label="Счёт-получатель"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {currencyLabel(a.currency)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl bg-white px-4 py-3 shadow-card">
        <span className="ui-kicker">
          Сумма · {currencyLabel(source?.currency ?? "BYN")}
        </span>
        <input
          name="amount"
          value={amount}
          onChange={(e) => {
            setError(null);
            setAmount(e.target.value);
          }}
          inputMode="decimal"
          autoComplete="off"
          aria-label="Сумма перевода"
          placeholder="0,00"
          className="mt-1.5 w-full border-0 bg-transparent p-0 text-2xl font-bold tabular-nums text-ink outline-none placeholder:text-ink-muted/45"
          aria-required
        />
        {sameAccount ? (
          <p className="mt-1 text-[11px] text-expense">
            Счёт не может перевести деньги сам себе.
          </p>
        ) : preview ? (
          <p
            className="mt-1 text-[12px] font-medium tabular-nums text-ink-muted"
            data-testid="transfer-preview"
          >
            ≈ {preview} на «{target?.name}»
          </p>
        ) : typed !== null ? (
          <p className="mt-1 text-[11px] text-ink-muted">
            Курс недоступен — задайте его в Настройках.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="ui-card block px-4 py-3">
          <span className="ui-kicker">Дата перевода</span>
          <input
            name="movedOn"
            type="date"
            value={movedOn}
            onChange={(e) => {
              setError(null);
              setMovedOn(e.target.value);
            }}
            className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
            aria-required
          />
        </label>

        <label className="ui-card block px-4 py-3">
          <span className="ui-kicker">Заметка</span>
          <input
            name="note"
            value={note}
            onChange={(e) => {
              setError(null);
              setNote(e.target.value);
            }}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Необязательно"
            className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control bg-expense-soft px-3 py-2 text-sm text-expense"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || sameAccount || !source || !target}
        className="ui-btn-primary w-full py-3.5"
      >
        {isPending ? "Сохраняем…" : "Перевести"}
      </button>

      {footer}
    </form>
  );
}

/** First Account that is not `excludeId` (keeps the pair distinct). */
function otherAccountId(accounts: Account[], excludeId?: string): string | null {
  const found = accounts.find((a) => a.id !== excludeId);
  return found?.id ?? null;
}

function parseTypedAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

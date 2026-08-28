"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setOpening,
  type SetOpeningResult,
} from "@/app/(app)/opening/actions";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
} from "@/components/icons";
import { formatAmountInput } from "@/lib/money/format-amount-input";
import { setOpeningErrorMessage } from "@/lib/opening/error-messages";
import type { Opening, SetOpeningInput } from "@/lib/opening/types";

type Props = {
  /** Account whose Remainder this is; null = cross-Account aggregate view. */
  accountId: string | null;
  /** Ready-made primary figure (already in the right Currency, «≈» if mixed). */
  remainderText: string | null;
  /** Ready-made secondary line ("≈ 1 250,00 Br"), or null. */
  approxText?: string | null;
  /** Account name shown under the figure; null in aggregate view. */
  accountName?: string | null;
  /** Currency label of the Opening form ("BYN" | "$" | "€"). */
  currencyLabel: string;
  opening: Opening | null;
  monthIncomeText: string;
  monthExpenseText: string;
  monthIncomeApprox?: string | null;
  monthExpenseApprox?: string | null;
  today: string;
  tomorrow: string;
  /** Where to go to set a start when viewing the aggregate without Openings. */
  pickAccountHref?: string | null;
  /** Injectable for tests; defaults to the Set Opening server action. */
  setOpeningFn?: (input: SetOpeningInput) => Promise<SetOpeningResult>;
};

/**
 * Home Remainder surface: prompt until the first Set Opening of the viewed
 * Account, then the live figure plus a way to replace that Opening.
 * Aggregate view shows the «≈» BYN total and points at a till to set a start.
 */
export function RemainderCard({
  accountId,
  remainderText,
  approxText = null,
  accountName = null,
  currencyLabel,
  opening,
  monthIncomeText,
  monthExpenseText,
  monthIncomeApprox = null,
  monthExpenseApprox = null,
  today,
  tomorrow,
  pickAccountHref = null,
  setOpeningFn = setOpening,
}: Props) {
  const router = useRouter();
  const absent = remainderText === null;
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(
    opening ? formatAmountInput(opening.amount) : "",
  );
  const [openedOn, setOpenedOn] = useState(opening?.openedOn ?? today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEditOpening = accountId !== null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await setOpeningFn({ accountId, amount, openedOn });
      if (result.status === "ok") {
        setEditing(false);
        router.refresh();
        return;
      }
      setError(setOpeningErrorMessage(result.reason));
    });
  }

  function startEditing() {
    setError(null);
    setAmount(opening ? formatAmountInput(opening.amount) : "");
    setOpenedOn(opening?.openedOn ?? today);
    setEditing(true);
  }

  return (
    <div className="space-y-4">
      <section aria-label="Остаток">
        {absent ? (
          canEditOpening ? (
            <EmptyRemainderPrompt currencyLabel={currencyLabel} />
          ) : (
            <AggregateWithoutOpening href={pickAccountHref} />
          )
        ) : (
          <PresentRemainder
            remainderText={remainderText}
            approxText={approxText}
            accountName={accountName}
            opening={opening}
            currencyLabel={currencyLabel}
            editing={editing}
            canEditOpening={canEditOpening}
            onEdit={startEditing}
            onCancel={() => {
              setError(null);
              setEditing(false);
            }}
          />
        )}

        {canEditOpening && (absent || editing) ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
            <label className="block rounded-2xl bg-white px-4 py-3 shadow-card focus-within:ring-2 focus-within:ring-brand/35">
              <span className="text-[12px] font-medium text-ink-muted">
                Сумма старта · {currencyLabel}
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
                autoFocus={absent}
                aria-label="Сумма старта"
                className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-bold tabular-nums text-ink outline-none placeholder:text-ink-muted/45"
                placeholder="0,00"
              />
            </label>

            <label className="block rounded-2xl bg-white px-4 py-3 shadow-card focus-within:ring-2 focus-within:ring-brand/35">
              <span className="text-[12px] font-medium text-ink-muted">
                Дата старта
              </span>
              <input
                name="openedOn"
                type="date"
                value={openedOn}
                max={tomorrow}
                onChange={(e) => {
                  setError(null);
                  setOpenedOn(e.target.value);
                }}
                aria-label="Дата старта"
                className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
              />
            </label>

            <p className="px-1 text-[12px] leading-snug text-pretty text-ink-muted">
              Дата — начало этого календарного дня. Если вечером уже записали
              расходы за сегодня и считаете наличные после них, поставьте
              завтра — тогда сегодняшние записи не вычтутся дважды.
            </p>

            {error ? (
              <p
                className="rounded-2xl bg-expense-soft px-3 py-2 text-sm text-expense"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="ui-btn-primary min-h-11 w-full py-3.5"
            >
              {isPending ? "Сохраняем…" : "Сохранить старт"}
            </button>
          </form>
        ) : null}
      </section>

      <div className="grid min-w-0 grid-cols-2 gap-2.5">
        <MonthTile
          label="Доходы за месяц"
          shortLabel="Доходы"
          value={monthIncomeText}
          approx={monthIncomeApprox}
          tone="income"
        />
        <MonthTile
          label="Расходы за месяц"
          shortLabel="Расходы"
          value={monthExpenseText}
          approx={monthExpenseApprox}
          tone="expense"
        />
      </div>
    </div>
  );
}

function EmptyRemainderPrompt({ currencyLabel }: { currencyLabel: string }) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-medium text-ink-muted">Остаток</p>
      <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-[-0.03em]">
        Задать старт
      </h2>
      <p className="mx-auto mt-2 max-w-[20rem] text-[13px] font-medium leading-snug text-ink-muted">
        Укажите, сколько денег в этом счёте ({currencyLabel}) вы посчитали, и
        дату. Пока старта нет, остаток не показываем.
      </p>
    </div>
  );
}

function AggregateWithoutOpening({ href }: { href: string | null }) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-medium text-ink-muted">Остаток</p>
      <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-[-0.03em]">
        Задать старт
      </h2>
      <p className="mx-auto mt-2 max-w-[20rem] text-[13px] font-medium leading-snug text-ink-muted">
        У каждого счёта свой старт. Выберите счёт и укажите, сколько в нём
        денег и на какую дату.
      </p>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] font-bold text-ink shadow-card transition hover:bg-white active:scale-95"
        >
          Открыть счёт
        </Link>
      ) : null}
    </div>
  );
}

function PresentRemainder({
  remainderText,
  approxText,
  accountName,
  opening,
  currencyLabel,
  editing,
  canEditOpening,
  onEdit,
  onCancel,
}: {
  remainderText: string;
  approxText: string | null;
  accountName: string | null;
  opening: Opening | null;
  currencyLabel: string;
  editing: boolean;
  canEditOpening: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-medium text-ink-muted">
        {accountName ? `Остаток · ${accountName}` : "Остаток"}
      </p>
      <p className="mt-2 text-[2.65rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.85rem]">
        {remainderText}
      </p>
      {approxText ? (
        <p className="mt-1.5 text-[13px] font-medium tabular-nums text-ink-muted">
          {approxText}
        </p>
      ) : null}
      <p className="mt-2.5 text-[13px] font-medium text-ink-muted">
        {opening
          ? `Старт ${formatOpening(opening.amount, currencyLabel)} · с ${formatOpeningDate(opening.openedOn)}`
          : canEditOpening
            ? "Живой остаток от старта"
            : "Сумма по всем счетам"}
      </p>
      {canEditOpening ? (
        editing ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 min-h-11 rounded-full px-3 text-[13px] font-semibold text-ink transition hover:opacity-70 active:scale-95"
          >
            Закрыть
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 min-h-11 rounded-full px-3 text-[13px] font-semibold text-ink transition hover:opacity-70 active:scale-95"
          >
            Изменить старт
          </button>
        )
      ) : null}
    </div>
  );
}

function MonthTile({
  label,
  shortLabel,
  value,
  approx,
  tone,
}: {
  label: string;
  shortLabel: string;
  value: string;
  approx: string | null;
  tone: "income" | "expense";
}) {
  const income = tone === "income";
  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 rounded-[1.25rem] bg-white px-2.5 py-2.5 shadow-card"
      aria-label={label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            income ? "bg-positive-soft text-positive" : "bg-expense-soft text-expense"
          }`}
          aria-hidden
        >
          {income ? (
            <IconArrowDownLeft size={15} />
          ) : (
            <IconArrowUpRight size={15} />
          )}
        </span>
        <p className="min-w-0 text-[11px] font-medium text-ink-muted">
          {shortLabel}
        </p>
      </div>
      <p
        className={`min-w-0 wrap-anywhere text-[13px] font-bold leading-snug tracking-[-0.03em] tabular-nums ${
          income ? "text-positive" : "text-expense"
        }`}
      >
        <MonthAmountValue value={value} />
      </p>
      {approx ? (
        <p className="min-w-0 text-[10px] font-medium tabular-nums text-ink-muted">
          {approx}
        </p>
      ) : null}
    </div>
  );
}

/** formatByn is one NBSP run; offer a wrap before Br, then mid-figure if needed. */
function MonthAmountValue({ value }: { value: string }) {
  const suffix = "\u00a0Br";
  if (!value.endsWith(suffix)) return value;
  return (
    <>
      {value.slice(0, -suffix.length)}
      <wbr />
      {suffix}
    </>
  );
}

function formatOpening(amount: number, currencyLabel: string): string {
  const body = amount.toLocaleString("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currencyLabel === "Br"
    ? `${body}\u00a0Br`
    : `${currencyLabel}${body}`;
}

function formatOpeningDate(openedOn: string): string {
  const d = new Date(`${openedOn}T12:00:00.000Z`);
  return d.toLocaleDateString("ru-BY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

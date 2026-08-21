"use client";

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
import { formatByn } from "@/lib/money/format";
import { formatAmountInput } from "@/lib/money/format-amount-input";
import type { MonthlyTotal } from "@/lib/money/history-types";
import { setOpeningErrorMessage } from "@/lib/opening/error-messages";
import type { Opening, SetOpeningInput } from "@/lib/opening/types";

type Props = {
  remainder: number | null;
  opening: Opening | null;
  monthTotals: MonthlyTotal;
  today: string;
  tomorrow: string;
  /** Injectable for tests; defaults to the Set Opening server action. */
  setOpeningFn?: (input: SetOpeningInput) => Promise<SetOpeningResult>;
};

/**
 * Home Remainder surface: prompt until the first Set Opening, then the live
 * figure plus a way to replace Opening. Month income/expense stay secondary.
 */
export function RemainderCard({
  remainder,
  opening,
  monthTotals,
  today,
  tomorrow,
  setOpeningFn = setOpening,
}: Props) {
  const router = useRouter();
  const absent = remainder === null;
  const [editing, setEditing] = useState(absent);
  const [amount, setAmount] = useState(
    opening ? formatAmountInput(opening.amount) : "",
  );
  const [openedOn, setOpenedOn] = useState(opening?.openedOn ?? today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await setOpeningFn({ amount, openedOn });
      if (result.status === "ok") {
        setEditing(false);
        router.refresh();
        return;
      }
      setError(setOpeningErrorMessage(result.reason));
    });
  }

  return (
    <div className="space-y-4">
      <section aria-label="Остаток">
        {absent ? (
          <EmptyRemainderPrompt />
        ) : (
          <PresentRemainder
            remainder={remainder}
            opening={opening}
            editing={editing}
            onEdit={() => {
              setError(null);
              setAmount(opening ? formatAmountInput(opening.amount) : "");
              setOpenedOn(opening?.openedOn ?? today);
              setEditing(true);
            }}
            onCancel={() => {
              setError(null);
              setEditing(false);
            }}
          />
        )}

        {absent || editing ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
            <label className="block rounded-2xl bg-white px-4 py-3 shadow-card focus-within:ring-2 focus-within:ring-brand/35">
              <span className="text-[12px] font-medium text-ink-muted">
                Сумма старта · BYN
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
                aria-label="Сумма старта · BYN"
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
          value={`+${formatByn(monthTotals.incomeTotal)}`}
          tone="income"
        />
        <MonthTile
          label="Расходы за месяц"
          shortLabel="Расходы"
          value={`−${formatByn(monthTotals.expenseTotal)}`}
          tone="expense"
        />
      </div>
    </div>
  );
}

function EmptyRemainderPrompt() {
  return (
    <div className="text-center">
      <p className="text-[13px] font-medium text-ink-muted">Остаток</p>
      <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-[-0.03em]">
        Задать старт
      </h2>
      <p className="mx-auto mt-2 max-w-[20rem] text-[13px] font-medium leading-snug text-ink-muted">
        Укажите, сколько наличных вы посчитали, и дату. Пока старта нет, остаток
        не показываем.
      </p>
    </div>
  );
}

function PresentRemainder({
  remainder,
  opening,
  editing,
  onEdit,
  onCancel,
}: {
  remainder: number;
  opening: Opening | null;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-medium text-ink-muted">Остаток</p>
      <p className="mt-2 text-[2.65rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.85rem]">
        {remainder < 0 ? "−" : ""}
        {formatByn(Math.abs(remainder))}
      </p>
      <p className="mt-2.5 text-[13px] font-medium text-ink-muted">
        {opening
          ? `Старт ${formatByn(opening.amount)} · с ${formatOpeningDate(opening.openedOn)}`
          : "Живой остаток от старта"}
      </p>
      {editing ? (
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
      )}
    </div>
  );
}

function MonthTile({
  label,
  shortLabel,
  value,
  tone,
}: {
  label: string;
  shortLabel: string;
  value: string;
  tone: "income" | "expense";
}) {
  const income = tone === "income";
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-[1.25rem] bg-white px-2.5 py-2.5 shadow-card"
      aria-label={label}
    >
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
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-ink-muted">{shortLabel}</p>
        <p
          className={`mt-0.5 truncate text-[13px] font-bold tabular-nums ${
            income ? "text-positive" : "text-expense"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function formatOpeningDate(openedOn: string): string {
  const d = new Date(`${openedOn}T12:00:00.000Z`);
  return d.toLocaleDateString("ru-BY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

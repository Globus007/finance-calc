"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setOpening,
  type SetOpeningResult,
} from "@/app/(app)/opening/actions";
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
    <div className="space-y-3">
      <section
        className="relative overflow-hidden rounded-hero bg-hero px-4 py-4 text-white shadow-hero"
        aria-label="Остаток"
      >
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#818CF8]/38 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

        <div className="relative">
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
            <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
              <label className="block rounded-xl bg-white/[0.08] px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/52">
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
                  className="mt-1.5 w-full border-0 bg-transparent p-0 text-xl font-bold tabular-nums text-white outline-none placeholder:text-white/35"
                  placeholder="0"
                />
              </label>

              <label className="block rounded-xl bg-white/[0.08] px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/52">
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
                  className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-white outline-none [color-scheme:dark]"
                />
              </label>

              <p className="text-[12px] leading-snug text-white/62">
                Дата — начало этого календарного дня. Если вечером уже записали
                расходы за сегодня и считаете наличные после них, поставьте
                завтра — тогда сегодняшние записи не вычтутся дважды.
              </p>

              {error ? (
                <p
                  className="rounded-control bg-[#FB923C]/16 px-3 py-2 text-sm text-[#FED7AA]"
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
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <MonthTile
          label="Доходы за месяц"
          value={`+${formatByn(monthTotals.incomeTotal)}`}
          tone="income"
        />
        <MonthTile
          label="Расходы за месяц"
          value={`−${formatByn(monthTotals.expenseTotal)}`}
          tone="expense"
        />
      </div>
    </div>
  );
}

function EmptyRemainderPrompt() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-hero-caption">
        Остаток
      </p>
      <h2 className="mt-1.5 text-[1.45rem] font-bold leading-tight tracking-[-0.04em]">
        Задать старт
      </h2>
      <p className="mt-2 text-[13px] font-medium leading-snug text-white/72">
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
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-hero-caption">
          Остаток
        </p>
        <p className="mt-1.5 text-[2.2rem] font-bold leading-none tracking-[-0.06em] tabular-nums sm:text-[2.45rem]">
          {remainder < 0 ? "−" : ""}
          {formatByn(Math.abs(remainder))}
        </p>
        <p className="mt-2 text-[13px] font-medium leading-snug text-white/72">
          {opening
            ? `Старт ${formatByn(opening.amount)} · с ${formatOpeningDate(opening.openedOn)}`
            : "Живой остаток от старта"}
        </p>
      </div>
      {editing ? (
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 shrink-0 rounded-full border border-white/20 px-3 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10 active:scale-95"
        >
          Закрыть
        </button>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 shrink-0 rounded-full border border-white/20 px-3 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10 active:scale-95"
        >
          Изменить старт
        </button>
      )}
    </div>
  );
}

function MonthTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div
      className="ui-card px-3 py-2.5"
      aria-label={label}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          tone === "income" ? "text-positive" : "text-expense"
        }`}
      >
        {value}
      </p>
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

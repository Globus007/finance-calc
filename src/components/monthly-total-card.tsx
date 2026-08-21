import { formatByn } from "@/lib/money/format";
import type { MonthlyTotal } from "@/lib/money/history-types";

type Props = {
  totals: MonthlyTotal;
  /** Optional heading under the net figure (e.g. month name). */
  caption?: string;
  /** Show simple income/expense bars (Month tab). */
  showBars?: boolean;
};

/**
 * Live Monthly total card: net, income total, expense total.
 * Empty month is zeros (same layout as incomplete current month).
 */
export function MonthlyTotalCard({
  totals,
  caption = "Нетто · текущий месяц",
  showBars = false,
}: Props) {
  const { expenseTotal, incomeTotal, net } = totals;
  const empty = expenseTotal === 0 && incomeTotal === 0;
  const max = Math.max(expenseTotal, incomeTotal, 1);
  const expH = Math.round((expenseTotal / max) * 100);
  const incH = Math.round((incomeTotal / max) * 100);
  const statusLabel = empty ? "пусто" : net >= 0 ? "плюс" : "минус";

  return (
    <section
      className="relative overflow-hidden rounded-hero bg-hero px-5 py-5 text-white shadow-hero"
      aria-label="Нетто"
    >
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-brand/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] font-medium text-hero-caption">
            {caption}
          </p>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              empty
                ? "border-white/20 bg-white/10 text-white/80"
                : net >= 0
                  ? "border-[var(--income-bright)]/25 bg-positive/20 text-[var(--income-bright)]"
                  : "border-[var(--expense-bright)]/25 bg-expense/20 text-[var(--expense-bright)]"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-2 text-[2.2rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.45rem]">
          {net < 0 ? "−" : ""}
          {formatByn(Math.abs(net))}
        </p>
        <p className="mt-2.5 text-[13px] font-medium leading-snug text-white/72">
          Доходы − расходы за месяц
        </p>
      </div>

      {showBars && !empty ? (
        <div
          className="relative mt-5 flex h-[5.25rem] items-end justify-center gap-8 border-b border-white/10 pb-3"
          aria-hidden
        >
          <div className="flex h-full flex-col items-center justify-end gap-1.5">
            <div
              className="w-10 rounded-t-lg bg-gradient-to-t from-positive to-[var(--income-bright)]"
              style={{ height: `${Math.max(incH, 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/60">Доходы</span>
          </div>
          <div className="flex h-full flex-col items-center justify-end gap-1.5">
            <div
              className="w-10 rounded-t-lg bg-gradient-to-t from-expense to-[var(--expense-bright)]"
              style={{ height: `${Math.max(expH, 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/60">Расходы</span>
          </div>
        </div>
      ) : null}

      <div
        className={`relative grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-2xl bg-white/[0.08] ${
          showBars && !empty ? "mt-3.5" : "mt-5"
        }`}
      >
        <MetricTile label="Доходы" value={`+${formatByn(incomeTotal)}`} tone="income" />
        <MetricTile label="Расходы" value={`−${formatByn(expenseTotal)}`} tone="expense" />
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="px-3.5 py-3">
      <p className="text-[11px] font-medium text-white/55">{label}</p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          tone === "income"
            ? "text-[var(--income-bright)]"
            : "text-[var(--expense-bright)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

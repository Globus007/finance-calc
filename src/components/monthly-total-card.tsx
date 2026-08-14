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
      className="relative overflow-hidden rounded-hero bg-hero px-4 py-4 text-white shadow-hero"
      aria-label="Итог месяца"
    >
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#818CF8]/38 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-hero-caption">
            {caption}
          </p>
          <p className="mt-1.5 text-[2.2rem] font-bold leading-none tracking-[-0.06em] tabular-nums sm:text-[2.45rem]">
            {net < 0 ? "−" : ""}
            {formatByn(Math.abs(net))}
          </p>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white/72">
            Доходы − расходы за месяц
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            empty
              ? "border-[#C7D2FE]/25 bg-[#C7D2FE]/12 text-[#E0E7FF]"
              : net >= 0
                ? "border-[var(--income-bright)]/25 bg-[#2DD4BF]/14 text-[var(--income-bright)]"
                : "border-[var(--expense-bright)]/25 bg-[#FB923C]/14 text-[var(--expense-bright)]"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {showBars ? (
        <div className="relative mt-5 flex h-[5.25rem] items-end justify-center gap-8 border-b border-white/10 pb-3">
          <div className="flex h-full flex-col items-center justify-end gap-1.5">
            <div
              className="w-10 rounded-t-lg bg-gradient-to-t from-[#34D399] to-[#A7F3D0] shadow-[0_0_16px_rgba(52,211,153,0.28)] transition-all"
              style={{ height: `${Math.max(incH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/60">Доход</span>
          </div>
          <div className="flex h-full flex-col items-center justify-end gap-1.5">
            <div
              className="w-10 rounded-t-lg bg-gradient-to-t from-[#FB923C] to-[#FED7AA] shadow-[0_0_16px_rgba(251,146,60,0.20)] transition-all"
              style={{ height: `${Math.max(expH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/60">Расход</span>
          </div>
        </div>
      ) : null}

      <div
        className={`relative grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-xl bg-white/[0.08] ${
          showBars ? "mt-3.5" : "mt-4"
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
    <div className="px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/52">
        {label}
      </p>
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

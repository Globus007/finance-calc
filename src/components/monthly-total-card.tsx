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
      className="relative overflow-hidden rounded-[2rem] bg-[#172033] px-5 py-5 text-white shadow-[0_24px_46px_-24px_rgba(23,32,51,0.72)]"
      aria-label="Итог месяца"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#818CF8]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-[#2DD4BF]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C7D2FE]">
            {caption}
          </p>
          <p className="mt-2 text-[2.35rem] font-bold leading-none tracking-[-0.055em] tabular-nums sm:text-[2.6rem]">
            {net < 0 ? "−" : ""}
            {formatByn(Math.abs(net))}
          </p>
          <p className="mt-2 text-xs text-white/58">Текущий финансовый баланс</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
            empty
              ? "border-[#C7D2FE]/25 bg-[#C7D2FE]/12 text-[#E0E7FF]"
              : net >= 0
                ? "border-[#99F6E4]/20 bg-[#2DD4BF]/14 text-[#99F6E4]"
                : "border-[#FED7AA]/20 bg-[#FB923C]/14 text-[#FED7AA]"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {showBars && (
        <div className="relative mt-6 flex h-24 items-end justify-center gap-10 border-b border-white/10 pb-4">
          <div className="flex h-full flex-col items-center justify-end gap-2">
            <div
              className="w-12 rounded-t-xl bg-gradient-to-t from-[#34D399] to-[#A7F3D0] shadow-[0_0_20px_rgba(52,211,153,0.30)] transition-all"
              style={{ height: `${Math.max(incH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/55">Доход</span>
          </div>
          <div className="flex h-full flex-col items-center justify-end gap-2">
            <div
              className="w-12 rounded-t-xl bg-gradient-to-t from-[#FB923C] to-[#FED7AA] shadow-[0_0_20px_rgba(251,146,60,0.22)] transition-all"
              style={{ height: `${Math.max(expH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-white/55">Расход</span>
          </div>
        </div>
      )}

      <div className={`relative grid grid-cols-2 gap-2.5 ${showBars ? "mt-4" : "mt-6"}`}>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/48">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          tone === "income" ? "text-[#99F6E4]" : "text-[#FED7AA]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

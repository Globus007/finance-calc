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

  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] bg-white px-5 py-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]"
      aria-label="Итог месяца"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#E0E7FF]" />
      <div className="pointer-events-none absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-[#F3E8FF]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#1A1B2E]/45">{caption}</p>
          <p className="mt-1 text-[2rem] font-bold tracking-tight tabular-nums">
            {net < 0 ? "−" : ""}
            {formatByn(Math.abs(net))}
          </p>
        </div>
        {showBars && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              empty
                ? "bg-[#E0E7FF] text-[#4338CA]"
                : net >= 0
                  ? "bg-[#D1FAE5] text-[#059669]"
                  : "bg-[#FEE2E2] text-[#DC2626]"
            }`}
          >
            {empty ? "пусто" : net >= 0 ? "плюс" : "минус"}
          </span>
        )}
      </div>

      {showBars && (
        <div className="relative mt-6 flex h-28 items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 rounded-t-xl bg-[#5B6CFF] transition-all"
              style={{ height: `${Math.max(incH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Доход
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 rounded-t-xl bg-[#FF8A4C] transition-all"
              style={{ height: `${Math.max(expH, empty ? 8 : 12)}%` }}
            />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Расход
            </span>
          </div>
        </div>
      )}

      <div
        className={`relative flex gap-6 ${showBars ? "mt-6 border-t border-[#1A1B2E]/06 pt-4" : "mt-4"}`}
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
            Доходы
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#10B981]">
            +{formatByn(incomeTotal)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
            Расходы
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#F97316]">
            −{formatByn(expenseTotal)}
          </p>
        </div>
      </div>
    </section>
  );
}

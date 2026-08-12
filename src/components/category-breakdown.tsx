import { formatByn } from "@/lib/money/format";
import type { CategoryBreakdownRow } from "@/lib/money/category-breakdown";

type Props = {
  rows: CategoryBreakdownRow[];
  /** Section heading / aria-label (Russian). */
  title?: string;
  /** When true, omit visible h2 (parent already shows a heading). */
  hideTitle?: boolean;
  /** Empty-state copy when there are no expense Categories this month. */
  emptyMessage?: string;
  /** Limit rows (e.g. Home top N). Omit for full list. */
  limit?: number;
};

/**
 * Expense-side Category breakdown for a month: amount, share bar, %.
 * Presentational — derived rows from computeCategoryBreakdown.
 */
export function CategoryBreakdown({
  rows,
  title = "По категориям",
  hideTitle = false,
  emptyMessage = "Нет расходов в этом месяце",
  limit,
}: Props) {
  const visible =
    limit != null && limit > 0 ? rows.slice(0, limit) : rows;

  return (
    <section aria-label={title}>
      {!hideTitle && (
        <h2 className="text-base font-bold tracking-[-0.025em]">{title}</h2>
      )}

      {visible.length === 0 ? (
        <p className="mt-3 rounded-[1.35rem] border border-white/80 bg-white/75 px-4 py-7 text-center text-sm text-[#697386] shadow-[0_12px_24px_-20px_rgba(23,32,51,0.30)] backdrop-blur-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {visible.map((row) => (
            <CategoryBreakdownRowItem
              key={row.categoryDisplayName}
              row={row}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryBreakdownRowItem({ row }: { row: CategoryBreakdownRow }) {
  const pct = Math.round(row.shareOfExpenseTotal * 1000) / 10;
  const barWidth = Math.max(row.shareOfExpenseTotal * 100, 2);

  return (
    <li className="rounded-[1.35rem] border border-white/85 bg-white/85 px-4 py-3.5 shadow-[0_10px_22px_-20px_rgba(23,32,51,0.34)] backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-[#172033]">
          {row.categoryDisplayName}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tracking-[-0.02em] tabular-nums text-[#E66B43]">
            −{formatByn(row.amount)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#697386]">
            {formatSharePercent(pct)}
          </p>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#172033]/[0.06]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FB923C] to-[#E66B43] transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </li>
  );
}

/** Format share for UI: 12,5% (Russian decimal comma). */
function formatSharePercent(pct: number): string {
  const text = pct.toLocaleString("ru-BY", {
    minimumFractionDigits: pct % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return `${text}%`;
}

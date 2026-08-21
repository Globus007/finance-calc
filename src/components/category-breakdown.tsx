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
    <section
      className="min-w-0 rounded-[1.75rem] bg-white px-4 pb-4 pt-4 shadow-card"
      aria-label={title}
    >
      {!hideTitle && (
        <h2 className="text-[1.05rem] font-bold tracking-[-0.03em]">{title}</h2>
      )}

      {visible.length === 0 ? (
        <p className="ui-empty">{emptyMessage}</p>
      ) : (
        <ul className="mt-1">
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
    <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-0.5 py-3">
      <p className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-ink">
        {row.categoryDisplayName}
      </p>
      <p className="text-right text-[13px] font-bold tracking-[-0.025em] tabular-nums text-expense">
        −{formatByn(row.amount)}
      </p>
      <div
        className="h-1.5 min-w-0 overflow-hidden rounded-full bg-expense-soft"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-expense"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-right text-[11px] font-medium tabular-nums text-ink-muted">
        {formatSharePercent(pct)}
      </p>
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

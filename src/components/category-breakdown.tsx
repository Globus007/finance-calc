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
        <h2 className="ui-title">{title}</h2>
      )}

      {visible.length === 0 ? (
        <p className="ui-empty">{emptyMessage}</p>
      ) : (
        <ul className="mt-2.5 space-y-2">
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
    <li className="ui-card px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-ink">
          {row.categoryDisplayName}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tracking-[-0.02em] tabular-nums text-expense">
            −{formatByn(row.amount)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-ink-muted">
            {formatSharePercent(pct)}
          </p>
        </div>
      </div>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"
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

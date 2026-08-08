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
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      )}

      {visible.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#1A1B2E]/45 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
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
    <li className="rounded-2xl bg-white px-3.5 py-3 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">
          {row.categoryDisplayName}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-[#F97316]">
            −{formatByn(row.amount)}
          </p>
          <p className="text-[11px] font-medium tabular-nums text-[#1A1B2E]/40">
            {formatSharePercent(pct)}
          </p>
        </div>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1A1B2E]/06"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[#FF8A4C] transition-all"
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

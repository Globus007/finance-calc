import Link from "next/link";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
} from "@/components/icons";
import { channelLabelRu } from "@/lib/money/channel-label";
import { formatByn, formatShortDate } from "@/lib/money/format";
import type { HistoryItem } from "@/lib/money/history-types";

type Props = {
  items: HistoryItem[];
  /** Empty-state copy (Russian). */
  emptyMessage?: string;
};

/**
 * Mixed committed History list (Expense + Income by Occurred on).
 * Rows link to Edit / Delete. Presentational — data loaded by RSC parents.
 */
export function HistoryList({
  items,
  emptyMessage = "Пока нет записей. Добавьте расход или доход через панель захвата.",
}: Props) {
  if (items.length === 0) {
    return (
      <p className="ui-empty">{emptyMessage}</p>
    );
  }

  return (
    <ul className="mt-2.5 space-y-2" aria-label="История">
      {items.map((item) => (
        <HistoryRow key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </ul>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const isIncome = item.kind === "income";
  const title = isIncome
    ? item.note || "Доход"
    : item.categoryDisplayName || "Расход";
  const subtitleParts = [
    formatShortDate(item.occurredOn),
    !isIncome && item.note ? item.note : null,
    channelLabelRu(item.channel),
  ].filter(Boolean);
  const href = `/history/${item.kind}/${item.id}`;
  const a11yLabel = isIncome
    ? `Редактировать доход ${title}`
    : `Редактировать расход ${title}`;

  return (
    <li>
      <Link
        href={href}
        aria-label={a11yLabel}
        className="ui-row group flex items-center gap-3 px-3 py-2.5 transition hover:border-brand-soft active:scale-[0.99]"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] ${
            isIncome
              ? "bg-positive-soft text-positive"
              : "bg-expense-soft text-expense"
          }`}
          aria-hidden
        >
          {isIncome ? (
            <IconArrowDownLeft size={18} />
          ) : (
            <IconArrowUpRight size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        <p
          className={`shrink-0 text-sm font-bold tracking-[-0.025em] tabular-nums ${
            isIncome ? "text-positive" : "text-ink"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatByn(item.amount)}
        </p>
      </Link>
    </li>
  );
}

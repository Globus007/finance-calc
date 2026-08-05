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
 * Presentational — data loaded by RSC parents.
 */
export function HistoryList({
  items,
  emptyMessage = "Пока нет записей. Добавьте расход или доход через панель захвата.",
}: Props) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#1A1B2E]/45 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2" aria-label="История">
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

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          isIncome
            ? "bg-[#D1FAE5] text-[#059669]"
            : "bg-[#FFEDD5] text-[#EA580C]"
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
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-[11px] text-[#1A1B2E]/40">
          {subtitleParts.join(" · ")}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-bold tabular-nums ${
          isIncome ? "text-[#059669]" : "text-[#1A1B2E]"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatByn(item.amount)}
      </p>
    </li>
  );
}

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
      <p className="mt-4 rounded-[1.35rem] border border-white/80 bg-white/75 px-5 py-9 text-center text-sm leading-relaxed text-[#697386] shadow-[0_12px_24px_-20px_rgba(23,32,51,0.30)] backdrop-blur-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2.5" aria-label="История">
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
        className="group flex items-center gap-3 rounded-[1.35rem] border border-white/85 bg-white/85 px-3 py-3 shadow-[0_10px_22px_-20px_rgba(23,32,51,0.36)] backdrop-blur-sm transition hover:border-[#DDE0FF] hover:bg-white active:scale-[0.99]"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
            isIncome
              ? "bg-[#DFF8EF] text-[#0F9F80] ring-[#0F9F80]/8"
              : "bg-[#FFF0E9] text-[#E66B43] ring-[#E66B43]/8"
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
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[#172033]">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#697386]">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        <p
          className={`shrink-0 text-sm font-bold tracking-[-0.025em] tabular-nums ${
            isIncome ? "text-[#0F9F80]" : "text-[#172033]"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatByn(item.amount)}
        </p>
      </Link>
    </li>
  );
}

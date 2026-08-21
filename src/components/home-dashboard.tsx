import Link from "next/link";
import { HistoryList } from "@/components/history-list";
import { IconTags } from "@/components/icons";
import { RemainderCard } from "@/components/remainder-card";
import type { HistoryItem, MonthlyTotal } from "@/lib/money/history-types";
import type { Opening } from "@/lib/opening/types";

type Props = {
  remainder: number | null;
  opening: Opening | null;
  monthTotals: MonthlyTotal;
  recent: HistoryItem[];
  today: string;
  tomorrow: string;
};

/**
 * Home: Remainder (or Set Opening), current-month tiles, recent History.
 * Expense Category breakdown lives on Month, not here.
 */
export function HomeDashboard({
  remainder,
  opening,
  monthTotals,
  recent,
  today,
  tomorrow,
}: Props) {
  return (
    <div className="ui-page min-w-0">
      <header className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[13px] font-bold tracking-[-0.04em] text-white"
            aria-hidden
          >
            Br
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink-muted">Личный обзор</p>
            <p className="text-[1.15rem] font-bold leading-tight tracking-[-0.03em]">
              Финансы
            </p>
          </div>
        </div>
        <Link
          href="/categories"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-white active:scale-95"
          aria-label="Категории"
        >
          <IconTags size={18} />
        </Link>
      </header>

      <div className="mt-7">
        <RemainderCard
          remainder={remainder}
          opening={opening}
          monthTotals={monthTotals}
          today={today}
          tomorrow={tomorrow}
        />
      </div>

      <section className="mt-6 min-w-0 rounded-[1.75rem] bg-white px-4 pb-4 pt-4 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[1.05rem] font-bold tracking-[-0.03em]">
            История
          </h2>
          <Link
            href="/history"
            className="text-[13px] font-semibold text-ink-muted transition hover:text-ink"
          >
            Все
          </Link>
        </div>
        <HistoryList items={recent} />
      </section>
    </div>
  );
}

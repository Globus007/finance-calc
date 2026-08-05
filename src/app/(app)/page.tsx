import Link from "next/link";
import { HistoryList } from "@/components/history-list";
import { IconTags } from "@/components/icons";
import { MonthlyTotalCard } from "@/components/monthly-total-card";
import { monthLabelRu } from "@/lib/dates/minsk-month";
import { loadHomeMoney } from "@/lib/money/load-money";

/**
 * Home: current-month live Monthly total + recent committed History.
 */
export default async function HomePage() {
  const { yearMonth, totals, recent } = await loadHomeMoney();
  const monthCaption = `Нетто · ${monthLabelRu(yearMonth).toLowerCase()}`;

  return (
    <div className="px-4 pb-6 pt-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#818CF8] text-sm font-bold text-white shadow-md shadow-[#5B6CFF]/30"
            aria-hidden
          >
            Br
          </div>
          <div>
            <p className="text-xs text-[#1A1B2E]/45">Привет</p>
            <p className="text-base font-semibold tracking-tight">Финансы</p>
          </div>
        </div>
        <Link
          href="/categories"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5B6CFF] shadow-sm shadow-black/5 transition active:scale-95"
          aria-label="Категории"
        >
          <IconTags size={18} />
        </Link>
      </header>

      <div className="mt-5">
        <MonthlyTotalCard totals={totals} caption={monthCaption} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">Последние</h2>
        <Link
          href="/history"
          className="text-xs font-semibold text-[#5B6CFF] transition active:opacity-70"
        >
          Все
        </Link>
      </div>
      <HistoryList items={recent} />
    </div>
  );
}

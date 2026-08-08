import { MonthSwitcher } from "@/components/month-switcher";
import { MonthlyTotalCard } from "@/components/monthly-total-card";
import {
  currentYearMonth,
  resolveYearMonth,
} from "@/lib/dates/minsk-month";
import { loadMonthMoney } from "@/lib/money/load-money";

/**
 * Month tab: live Monthly total for a selected calendar month (Europe/Minsk).
 * Default is the current month; prev/next switcher browses past months up to current.
 * Empty month and incomplete current month use the same live sum.
 */
export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const params = await searchParams;
  const current = currentYearMonth();
  const requested = resolveYearMonth(params.ym);
  // Past + current only (MVP): clamp crafted future ?ym= to current month.
  const yearMonth = requested > current ? current : requested;
  const { totals, items } = await loadMonthMoney(yearMonth);

  return (
    <div className="px-4 pb-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Итог месяца</h1>
      <p className="mt-1 text-sm text-[#1A1B2E]/45">Europe/Minsk · живой итог</p>

      <MonthSwitcher yearMonth={yearMonth} />

      <div className="mt-4">
        <MonthlyTotalCard totals={totals} caption="Нетто" showBars />
      </div>

      <p className="mt-4 text-center text-[11px] text-[#1A1B2E]/40">
        {items.length === 0
          ? "Пока нет расходов и доходов · живой итог"
          : `${formatCount(items.length)} · живой итог`}
      </p>
    </div>
  );
}

function formatCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} записи`;
  }
  return `${n} записей`;
}

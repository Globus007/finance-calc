import { CategoryBreakdown } from "@/components/category-breakdown";
import { MonthlyTotalCard } from "@/components/monthly-total-card";
import { monthLabelRu } from "@/lib/dates/minsk-month";
import { computeCategoryBreakdown } from "@/lib/money/category-breakdown";
import { loadMonthMoney } from "@/lib/money/load-money";

/**
 * Month tab: live Monthly total + expense Category breakdown
 * for the current calendar month (Europe/Minsk).
 * Empty month and incomplete current month use the same live sum.
 */
export default async function MonthPage() {
  const { yearMonth, totals, items } = await loadMonthMoney();
  const label = monthLabelRu(yearMonth);
  const breakdown = computeCategoryBreakdown(items);

  return (
    <div className="px-4 pb-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Итог месяца</h1>
      <p className="mt-1 text-sm text-[#1A1B2E]/45">
        {label} · Europe/Minsk
      </p>

      <div className="mt-4">
        <MonthlyTotalCard
          totals={totals}
          caption="Нетто"
          showBars
        />
      </div>

      <div className="mt-6">
        <CategoryBreakdown rows={breakdown} />
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

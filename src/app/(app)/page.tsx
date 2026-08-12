import Link from "next/link";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { HistoryList } from "@/components/history-list";
import { IconTags } from "@/components/icons";
import { MonthlyTotalCard } from "@/components/monthly-total-card";
import { monthLabelRu } from "@/lib/dates/minsk-month";
import { computeCategoryBreakdown } from "@/lib/money/category-breakdown";
import { loadHomeMoney } from "@/lib/money/load-money";

const HOME_TOP_CATEGORIES = 5;

/**
 * Home: current-month live Monthly total, top expense Categories, recent History.
 */
export default async function HomePage() {
  const { yearMonth, totals, recent, monthItems } = await loadHomeMoney();
  const monthCaption = `Нетто · ${monthLabelRu(yearMonth).toLowerCase()}`;
  const topCategories = computeCategoryBreakdown(monthItems);

  return (
    <div className="px-4 pb-7 pt-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#3730A3] text-sm font-bold text-white shadow-[0_14px_24px_-12px_rgba(79,70,229,0.62)]"
            aria-hidden
          >
            Br
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#697386]">
              Личный обзор
            </p>
            <p className="mt-0.5 text-lg font-bold tracking-[-0.035em]">Финансы</p>
          </div>
        </div>
        <Link
          href="/categories"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-[#4F46E5] shadow-[0_10px_20px_-16px_rgba(23,32,51,0.50)] backdrop-blur transition hover:bg-white active:scale-95"
          aria-label="Категории"
        >
          <IconTags size={18} />
        </Link>
      </header>

      <div className="mt-6">
        <MonthlyTotalCard totals={totals} caption={monthCaption} />
      </div>

      {topCategories.length > 0 && (
        <section className="mt-8">
          <SectionHeading title="Структура расходов" href="/month" linkLabel="Аналитика" />
          <CategoryBreakdown
            rows={topCategories}
            title="Структура расходов"
            limit={HOME_TOP_CATEGORIES}
            hideTitle
          />
        </section>
      )}

      <section className="mt-8">
        <SectionHeading title="Последние операции" href="/history" linkLabel="Все" />
        <HistoryList items={recent} />
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#697386]">
          Обзор
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-[-0.035em]">{title}</h2>
      </div>
      <Link
        href={href}
        className="rounded-full bg-[#E9EAFE] px-3 py-1.5 text-[11px] font-bold text-[#4F46E5] transition hover:bg-[#DDE0FF] active:scale-95"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

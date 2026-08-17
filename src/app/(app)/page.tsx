import Link from "next/link";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { HistoryList } from "@/components/history-list";
import { IconTags } from "@/components/icons";
import { RemainderCard } from "@/components/remainder-card";
import { todayInMinsk, tomorrowInMinsk } from "@/lib/dates/minsk-today";
import { computeCategoryBreakdown } from "@/lib/money/category-breakdown";
import { loadHomeMoney } from "@/lib/money/load-money";

const HOME_TOP_CATEGORIES = 5;

/**
 * Home: live Remainder from Opening, current-month tiles, top Categories, recent History.
 */
export default async function HomePage() {
  const { totals, recent, monthItems, opening, remainder } =
    await loadHomeMoney();
  const today = todayInMinsk();
  const tomorrow = tomorrowInMinsk();
  const topCategories = computeCategoryBreakdown(monthItems);

  return (
    <div className="ui-page">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-control text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(79,70,229,0.58)]"
            style={{ background: "var(--brand-fill)" }}
            aria-hidden
          >
            Br
          </div>
          <div>
            <p className="ui-kicker">Личный обзор</p>
            <p className="mt-0.5 text-[1.05rem] font-bold tracking-[-0.03em]">Финансы</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/proposals"
            className="rounded-control bg-brand-soft px-3 py-2 text-xs font-bold text-brand transition hover:brightness-95 active:scale-95"
          >
            КП
          </Link>
          <Link
            href="/categories"
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line bg-surface-strong text-brand shadow-card transition hover:bg-brand-soft active:scale-95"
            aria-label="Категории"
          >
            <IconTags size={18} />
          </Link>
        </div>
      </header>

      <div className="mt-5">
        <RemainderCard
          remainder={remainder}
          opening={opening}
          monthTotals={totals}
          today={today}
          tomorrow={tomorrow}
        />
      </div>

      {topCategories.length > 0 ? (
        <section className="mt-6">
          <SectionHeading title="Структура расходов" href="/month" linkLabel="Аналитика" />
          <CategoryBreakdown
            rows={topCategories}
            title="Структура расходов"
            limit={HOME_TOP_CATEGORIES}
            hideTitle
          />
        </section>
      ) : null}

      <section className="mt-6">
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
      <h2 className="ui-title">{title}</h2>
      <Link
        href={href}
        className="rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand transition hover:brightness-95 active:scale-95"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

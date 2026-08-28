import { AccountSwitcher } from "@/components/account-switcher";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { MonthSwitcher } from "@/components/month-switcher";
import { MonthlyTotalCard } from "@/components/monthly-total-card";
import { monthLabelRu } from "@/lib/dates/minsk-month";
import { currentYearMonth, resolveYearMonth } from "@/lib/dates/minsk-month";
import { currencyLabel } from "@/lib/money/display";
import { computeCategoryBreakdown } from "@/lib/money/category-breakdown";
import { formatApproxIn } from "@/lib/money/format";
import { loadMonthMoney } from "@/lib/money/load-money";

/**
 * Month tab: live Monthly total + expense Category breakdown for one calendar
 * month (Europe/Minsk) and one Account — or the «≈» BYN aggregate across all
 * Accounts. Transfers never enter these totals (ADR-0014).
 */
export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; acc?: string }>;
}) {
  const params = await searchParams;
  const current = currentYearMonth();
  const requested = resolveYearMonth(params.ym);
  // Past + current only (MVP): clamp crafted future ?ym= to current month.
  const yearMonth = requested > current ? current : requested;
  const account = params.acc?.trim() || null;

  const {
    accounts,
    selected,
    unknownAccount,
    currency,
    approximate,
    totals,
    totalsByn,
    items,
  } = await loadMonthMoney(yearMonth, account);

  const breakdown = computeCategoryBreakdown(items, currency);
  const bynMirror = !approximate && currency !== "BYN";
  const label = currencyLabel(currency);

  const caption = [
    "Нетто",
    monthLabelRu(yearMonth),
    selected ? selected.name : "все счета",
  ].join(" · ");

  // Single non-BYN till: mirror its figures in BYN. The aggregate view is
  // already BYN and carries «≈» in the figures themselves.
  const secondary =
    bynMirror && totalsByn
      ? {
          net: formatApproxIn("BYN", totalsByn.net),
          income: formatApproxIn("BYN", totalsByn.incomeTotal),
          expense: formatApproxIn("BYN", totalsByn.expenseTotal),
        }
      : null;

  return (
    <div className="ui-page pb-12">
      <h1 className="text-[1.55rem] font-bold tracking-[-0.04em]">Итог месяца</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Расходы и доходы · календарный месяц
        {selected ? ` · ${selected.name} (${label})` : ""}
      </p>

      <AccountSwitcher
        accounts={accounts}
        selectedId={selected?.id ?? null}
        hrefFor={(accountId) =>
          `/month?ym=${yearMonth}${accountId ? `&acc=${accountId}` : ""}`
        }
      />

      {unknownAccount ? (
        <p
          className="mt-3 rounded-control bg-expense-soft px-3 py-2 text-[13px] text-expense"
          role="alert"
        >
          Этот счёт недоступен — показывает все счета.
        </p>
      ) : null}

      <MonthSwitcher
        yearMonth={yearMonth}
        hrefFor={(ym) =>
          `/month?ym=${ym}${selected ? `&acc=${selected.id}` : ""}`
        }
      />

      <div className="mt-5">
        <MonthlyTotalCard
          totals={totals}
          caption={caption}
          showBars
          secondary={secondary}
          currency={currency}
          approximate={approximate}
        />
      </div>

      <div className="mt-6">
        <CategoryBreakdown rows={breakdown} currency={currency} />
      </div>

      {items.length > 0 ? (
        <p className="mt-4 text-center text-[11px] text-ink-muted">
          {formatCount(items.length)}
        </p>
      ) : null}
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

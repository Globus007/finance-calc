import { HomeDashboard } from "@/components/home-dashboard";
import { loadAccountMap } from "@/lib/accounts/load-accounts";
import { todayInMinsk, tomorrowInMinsk } from "@/lib/dates/minsk-today";
import {
  approxBynLine,
  currencyLabel,
  remainderText,
  signedTotalText,
} from "@/lib/money/display";
import { loadHomeMoney } from "@/lib/money/load-money";

/**
 * Home: live Remainder of one Account (exact in its Currency) or the «≈» BYN
 * aggregate, current-month tiles, recent History.
 * Selection is carried in `?acc=`; absent = aggregate (or the only till).
 * Server-side precompute: components receive ready-made strings (ADR-0013).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ acc?: string }>;
}) {
  const params = await searchParams;
  const requested = params.acc?.trim() || null;
  const [view, accountById] = await Promise.all([
    loadHomeMoney(requested),
    loadAccountMap(),
  ]);

  const { selected, currency, approximate } = view;
  const label = currencyLabel(currency);
  const bynMirror = !approximate && currency !== "BYN";

  return (
    <HomeDashboard
      accounts={view.accounts}
      selected={selected}
      unknownAccount={view.unknownAccount}
      remainderText={remainderText(view.remainder, currency, approximate)}
      approxText={
        bynMirror ? approxBynLine(view.remainderByn, currency) : null
      }
      currencyLabel={label}
      opening={view.opening}
      monthIncomeText={signedTotalText(
        view.monthTotals.incomeTotal,
        currency,
        "+",
        approximate,
      )}
      monthExpenseText={signedTotalText(
        view.monthTotals.expenseTotal,
        currency,
        "−",
        approximate,
      )}
      monthIncomeApprox={
        bynMirror ? approxBynLine(view.monthTotalsByn?.incomeTotal, currency) : null
      }
      monthExpenseApprox={
        bynMirror ? approxBynLine(view.monthTotalsByn?.expenseTotal, currency) : null
      }
      recent={view.recent}
      accountById={accountById}
      today={todayInMinsk()}
      tomorrow={tomorrowInMinsk()}
      hrefFor={(accountId) => (accountId ? `/?acc=${accountId}` : "/")}
    />
  );
}

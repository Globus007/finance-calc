import Link from "next/link";
import { AccountSwitcher } from "@/components/account-switcher";
import { HistoryList } from "@/components/history-list";
import { IconGear } from "@/components/icons";
import { RemainderCard } from "@/components/remainder-card";
import type { Account } from "@/lib/accounts/types";
import type { HistoryEntry } from "@/lib/money/history-types";
import type { Opening } from "@/lib/opening/types";

type Props = {
  accounts: Account[];
  /** null = «Все счета» aggregate view. */
  selected: Account | null;
  /** Crafted ?acc= that is not one of the user's Accounts. */
  unknownAccount: boolean;
  remainderText: string | null;
  approxText: string | null;
  currencyLabel: string;
  opening: Opening | null;
  monthIncomeText: string;
  monthExpenseText: string;
  monthIncomeApprox: string | null;
  monthExpenseApprox: string | null;
  recent: HistoryEntry[];
  /** id → Account, so History rows can name their till. */
  accountById: Record<string, Account>;
  today: string;
  tomorrow: string;
  /** Home href for a selection (null = aggregate). */
  hrefFor: (accountId: string | null) => string;
};

/**
 * Home: Remainder of one Account (exact in its Currency) or the «≈» BYN
 * aggregate, current-month tiles, recent History.
 * Expense Category breakdown lives on Month, not here.
 */
export function HomeDashboard({
  accounts,
  selected,
  unknownAccount,
  remainderText,
  approxText,
  currencyLabel,
  opening,
  monthIncomeText,
  monthExpenseText,
  monthIncomeApprox,
  monthExpenseApprox,
  recent,
  accountById,
  today,
  tomorrow,
  hrefFor,
}: Props) {
  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;

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
          href="/settings"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-white active:scale-95"
          aria-label="Настройки"
        >
          <IconGear size={18} />
        </Link>
      </header>

      <AccountSwitcher
        accounts={accounts}
        selectedId={selected?.id ?? null}
        hrefFor={hrefFor}
      />

      {unknownAccount ? (
        <p
          className="mt-3 rounded-control bg-expense-soft px-3 py-2 text-[13px] text-expense"
          role="alert"
        >
          Этот счёт недоступен — показывает все счета.
        </p>
      ) : null}

      <div className="mt-7">
        <RemainderCard
          accountId={selected?.id ?? null}
          remainderText={remainderText}
          approxText={approxText}
          accountName={selected?.name ?? null}
          currencyLabel={currencyLabel}
          opening={opening}
          monthIncomeText={monthIncomeText}
          monthExpenseText={monthExpenseText}
          monthIncomeApprox={monthIncomeApprox}
          monthExpenseApprox={monthExpenseApprox}
          today={today}
          tomorrow={tomorrow}
          pickAccountHref={
            defaultAccount ? hrefFor(defaultAccount.id) : null
          }
        />
      </div>

      <section className="mt-6 min-w-0 rounded-[1.75rem] bg-white px-4 pb-4 pt-4 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[1.05rem] font-bold tracking-[-0.03em]">
            История
          </h2>
          <Link
            href={selected ? `/history?acc=${selected.id}` : "/history"}
            className="text-[13px] font-semibold text-ink-muted transition hover:text-ink"
          >
            Все
          </Link>
        </div>
        <HistoryList
          entries={recent}
          accountById={accountById}
          showAccountNames={selected === null}
        />
      </section>
    </div>
  );
}

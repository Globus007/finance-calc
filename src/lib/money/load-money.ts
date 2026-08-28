import { cache } from "react";
import {
  getDefaultAccount,
  listAccounts,
} from "@/lib/accounts/load-accounts";
import type { Account } from "@/lib/accounts/types";
import { currentYearMonth, monthDateBounds } from "@/lib/dates/minsk-month";
import { remainderFromTotals } from "@/lib/opening/compute-remainder";
import type { Opening } from "@/lib/opening/types";
import { getEffectiveRates, toByn, type Currency, type RateMap } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import { TRANSFER_HISTORY_SELECT, mapTransferRow, type TransferDbRow } from "@/lib/transfers/map-row";
import type { HistoryEntry, HistoryItem, MonthlyTotal } from "./history-types";
import { EMPTY_TOTALS } from "./history-types";
import {
  EXPENSE_HISTORY_SELECT,
  INCOME_HISTORY_SELECT,
  mapExpenseRow,
  mapIncomeRow,
  parseNumeric,
  type ExpenseDbRow,
  type IncomeDbRow,
} from "./map-row";
import { compareHistory, mergeHistory } from "./merge-history";
import { entryTouchesAccount } from "./filter-history";
import { fetchSum, fetchTransferFlows } from "./fetch-sum";

const RECENT_LIMIT = 5;

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** What Home / Month show for one view (a single Account or the aggregate). */
export type MoneyView = {
  yearMonth: string;
  accounts: Account[];
  /** Selected Account; null = «Все счета» aggregate view. */
  selected: Account | null;
  /** Crafted ?acc= that is not one of the user's Accounts. */
  unknownAccount: boolean;
  /** Currency of `remainder` / `monthTotals`. */
  currency: Currency;
  /** Aggregate BYN figures are approximate («≈»); per-Account ones are exact. */
  approximate: boolean;
  opening: Opening | null;
  remainder: number | null;
  /** BYN mirror of `remainder` (single-Account secondary line). */
  remainderByn: number | null;
  monthTotals: MonthlyTotal;
  /** BYN mirror of `monthTotals` (single-Account secondary line). */
  monthTotalsByn: MonthlyTotal | null;
  recent: HistoryEntry[];
};

export type MonthMoney = {
  yearMonth: string;
  accounts: Account[];
  selected: Account | null;
  unknownAccount: boolean;
  currency: Currency;
  approximate: boolean;
  totals: MonthlyTotal;
  totalsByn: MonthlyTotal | null;
  /** Expenses + Incomes only — Transfers never enter Monthly totals. */
  items: HistoryItem[];
};

/**
 * Home: per-Account Remainder (exact in its Currency) or the BYN aggregate,
 * current-month totals, recent History.
 */
export const loadHomeMoney = cache(
  async (accountId?: string | null): Promise<MoneyView> => {
    const yearMonth = currentYearMonth();
    const supabase = await createClient();
    const user = userFromGetUserResult(await supabase.auth.getUser());
    const accounts = await listAccounts();

    if (!user) {
      return {
        yearMonth,
        accounts: [],
        selected: null,
        unknownAccount: false,
        currency: "BYN",
        approximate: false,
        opening: null,
        remainder: null,
        remainderByn: null,
        monthTotals: EMPTY_TOTALS,
        monthTotalsByn: null,
        recent: [],
      };
    }

    const { selected, unknownAccount } = resolveAccount(accounts, accountId, {
      defaultToSingle: true,
    });
    const [openings, recent] = await Promise.all([
      fetchOpenings(supabase),
      fetchRecent(supabase, selected),
    ]);

    // NBRB is touched only when some Account actually needs a rate (ADR-0013).
    const rates = accounts.some((a) => a.currency !== "BYN")
      ? await getEffectiveRates()
      : {};
    const { start, end } = monthDateBounds(yearMonth);

    // Aggregate view: BYN figures only. Single Account: native + BYN mirror.
    if (selected) {
      const nativeTotals = await fetchMonthTotals(supabase, selected, {
        start,
        end,
      });
      const opening = openings.get(selected.id) ?? null;
      const remainder =
        opening === null
          ? null
          : await fetchRemainder(supabase, selected, opening);
      return {
        yearMonth,
        accounts,
        selected,
        unknownAccount,
        currency: selected.currency,
        approximate: false,
        opening,
        remainder,
        remainderByn:
          remainder === null
            ? null
            : amountInByn(remainder, selected.currency, rates),
        monthTotals: nativeTotals,
        monthTotalsByn:
          selected.currency === "BYN"
            ? null
            : totalsInByn(nativeTotals, selected.currency, rates),
        recent,
      };
    }

    // «Все счета»: native per-Account figures converted at the current rate.
    const monthTotals = await fetchAggregateMonthTotalsInByn(
      supabase,
      accounts,
      { start, end },
      rates,
    );
    const remainder = await aggregateRemainder(supabase, accounts, openings, rates);

    return {
      yearMonth,
      accounts,
      selected: null,
      unknownAccount,
      currency: "BYN",
      approximate: true,
      opening: null,
      remainder,
      remainderByn: null,
      monthTotals,
      monthTotalsByn: null,
      recent,
    };
  },
);

/**
 * Full mixed History of committed Expenses, Incomes, and Transfers (no Drafts).
 * `accountId` narrows to one Account; a Transfer matches either endpoint.
 */
export const loadHistory = cache(
  async (accountId?: string | null): Promise<HistoryEntry[]> => {
    const supabase = await createClient();
    const user = userFromGetUserResult(await supabase.auth.getUser());
    if (!user) return [];

    const [expenses, incomes, transfers] = await Promise.all([
      fetchExpenses(supabase),
      fetchIncomes(supabase),
      fetchTransfers(supabase),
    ]);

    const entries: HistoryEntry[] = [...expenses, ...incomes, ...transfers];
    if (!accountId) return mergeHistory(entries);
    return mergeHistory(
      entries.filter((entry) => entryTouchesAccount(entry, accountId)),
    );
  },
);

/**
 * Month tab: live Monthly total for one calendar month (default: current
 * Europe/Minsk) for one Account or the BYN aggregate across all of them.
 */
export const loadMonthMoney = cache(
  async (
    yearMonth: string = currentYearMonth(),
    accountId?: string | null,
  ): Promise<MonthMoney> => {
    const { start, end } = monthDateBounds(yearMonth);
    const supabase = await createClient();
    const user = userFromGetUserResult(await supabase.auth.getUser());
    const accounts = await listAccounts();

    if (!user) {
      return {
        yearMonth,
        accounts: [],
        selected: null,
        unknownAccount: false,
        currency: "BYN",
        approximate: false,
        totals: EMPTY_TOTALS,
        totalsByn: null,
        items: [],
      };
    }

    const { selected, unknownAccount } = resolveAccount(accounts, accountId, {
      defaultToSingle: true,
    });
    const [expenses, incomes] = await Promise.all([
      fetchExpenses(supabase, { start, end, accountId: selected?.id }),
      fetchIncomes(supabase, { start, end, accountId: selected?.id }),
    ]);
    const items = [...expenses, ...incomes].sort(compareHistory);

    const rates = accounts.some((a) => a.currency !== "BYN")
      ? await getEffectiveRates()
      : {};
    const totals = selected
      ? await fetchMonthTotals(supabase, selected, { start, end })
      : await fetchAggregateMonthTotalsInByn(
          supabase,
          accounts,
          { start, end },
          rates,
        );
    const totalsByn =
      selected && selected.currency !== "BYN"
        ? totalsInByn(totals, selected.currency, rates)
        : null;

    return {
      yearMonth,
      accounts,
      selected,
      unknownAccount,
      currency: selected?.currency ?? "BYN",
      approximate: selected === null,
      totals,
      totalsByn,
      items,
    };
  },
);

/** The Account a fast capture (photo / voice / bot) commits to. */
export { getDefaultAccount };

function resolveAccount(
  accounts: Account[],
  accountId?: string | null,
  options: { defaultToSingle?: boolean } = {},
): { selected: Account | null; unknownAccount: boolean } {
  // One till: the Account view and the aggregate view coincide, and the
  // single-till UX (exact figures, editable Opening) stays intact (story #13).
  if (!accountId && options.defaultToSingle && accounts.length === 1) {
    return { selected: accounts[0], unknownAccount: false };
  }
  if (!accountId) return { selected: null, unknownAccount: false };
  const found = accounts.find((a) => a.id === accountId) ?? null;
  return { selected: found, unknownAccount: found === null };
}

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

type Range = { start?: string; end?: string };

function nativeColumn(account: Account | null): "amount" | "original_amount" {
  // A BYN till sums canonical BYN — legacy rows typed in $ inside the old
  // single till keep contributing their BYN figure.
  return account && account.currency !== "BYN" ? "original_amount" : "amount";
}

async function fetchMonthTotals(
  supabase: SupabaseServer,
  account: Account | null,
  range: Range,
): Promise<MonthlyTotal> {
  const column = nativeColumn(account);
  const filter = { accountId: account?.id, from: range.start, to: range.end };
  const [expenseTotal, incomeTotal] = await Promise.all([
    fetchSum(supabase, "expenses", column, filter),
    fetchSum(supabase, "incomes", column, filter),
  ]);
  return totals(expenseTotal, incomeTotal);
}

/**
 * Cross-Account Monthly total: each Account's native totals converted at the
 * rate effective now (ADR-0014). An Account whose rate is missing contributes
 * nothing rather than a 1:1 stand-in.
 */
async function fetchAggregateMonthTotalsInByn(
  supabase: SupabaseServer,
  accounts: Account[],
  range: Range,
  rates: RateMap,
): Promise<MonthlyTotal> {
  const parts = await Promise.all(
    accounts.map(async (account) => {
      const native = await fetchMonthTotals(supabase, account, range);
      if (account.currency === "BYN") return native;
      return totalsInByn(native, account.currency, rates);
    }),
  );

  let expenseTotal = 0;
  let incomeTotal = 0;
  for (const part of parts) {
    if (!part) continue;
    expenseTotal += part.expenseTotal;
    incomeTotal += part.incomeTotal;
  }
  return totals(expenseTotal, incomeTotal);
}

/** Live Remainder of one Account, exact in its Currency (includes Transfers). */
async function fetchRemainder(
  supabase: SupabaseServer,
  account: Account,
  opening: Opening,
): Promise<number | null> {
  const column = nativeColumn(account);
  const filter = { accountId: account.id, from: opening.openedOn };
  const [expenseTotal, incomeTotal, flows] = await Promise.all([
    fetchSum(supabase, "expenses", column, filter),
    fetchSum(supabase, "incomes", column, filter),
    fetchTransferFlows(supabase, account.id, { from: opening.openedOn }),
  ]);
  return remainderFromTotals(
    opening,
    incomeTotal,
    expenseTotal,
    flows.incoming,
    flows.outgoing,
  );
}

/**
 * Cross-Account Remainder: every Account's native figure converted to BYN at
 * the rate effective now — hence the «≈» label (ADR-0014). Accounts without an
 * Opening have no Remainder and contribute nothing.
 */
async function aggregateRemainder(
  supabase: SupabaseServer,
  accounts: Account[],
  openings: Map<string, Opening>,
  rates: RateMap,
): Promise<number | null> {
  const withOpening = accounts.filter((a) => openings.has(a.id));
  if (withOpening.length === 0) return null;

  const remainders = await Promise.all(
    withOpening.map(async (account) => {
      const remainder = await fetchRemainder(
        supabase,
        account,
        openings.get(account.id) as Opening,
      );
      if (remainder === null) return null;
      return amountInByn(remainder, account.currency, rates);
    }),
  );

  const convertible = remainders.filter((value): value is number => value !== null);
  if (convertible.length === 0) return null;
  return round2(convertible.reduce((sum, value) => sum + value, 0));
}

/** Native amount in BYN at the current rate; 0 stays 0; missing rate → null. */
function amountInByn(
  amount: number,
  currency: Currency,
  rates: RateMap,
): number | null {
  if (amount === 0) return 0;
  return toByn(amount, currency, rates);
}

function totalsInByn(
  native: MonthlyTotal,
  currency: Currency,
  rates: RateMap,
): MonthlyTotal | null {
  if (currency === "BYN") return null;
  const expenseTotal = amountInByn(native.expenseTotal, currency, rates);
  const incomeTotal = amountInByn(native.incomeTotal, currency, rates);
  if (expenseTotal === null || incomeTotal === null) return null;
  return totals(expenseTotal, incomeTotal);
}

async function fetchOpenings(
  supabase: SupabaseServer,
): Promise<Map<string, Opening>> {
  const { data, error } = await supabase
    .from("openings")
    .select("account_id, amount, opened_on");

  if (error) {
    throw new Error(`Failed to load openings: ${error.message}`);
  }

  const out = new Map<string, Opening>();
  for (const row of (data ?? []) as {
    account_id: string;
    amount: string | number;
    opened_on: string;
  }[]) {
    out.set(row.account_id, {
      accountId: row.account_id,
      amount: parseNumeric(row.amount),
      openedOn: row.opened_on,
    });
  }
  return out;
}

type FetchRange = Range & { limit?: number; accountId?: string };

async function fetchExpenses(
  supabase: SupabaseServer,
  range: FetchRange = {},
): Promise<HistoryItem[]> {
  const rows = await fetchRows<ExpenseDbRow>(
    supabase,
    "expenses",
    EXPENSE_HISTORY_SELECT,
    range,
  );
  return rows.map(mapExpenseRow);
}

async function fetchIncomes(
  supabase: SupabaseServer,
  range: FetchRange = {},
): Promise<HistoryItem[]> {
  const rows = await fetchRows<IncomeDbRow>(
    supabase,
    "incomes",
    INCOME_HISTORY_SELECT,
    range,
  );
  return rows.map(mapIncomeRow);
}

async function fetchRows<T>(
  supabase: SupabaseServer,
  table: "expenses" | "incomes",
  select: string,
  range: FetchRange,
): Promise<T[]> {
  let q = supabase
    .from(table)
    .select(select)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.accountId) q = q.eq("account_id", range.accountId);
  if (range.start) q = q.gte("occurred_on", range.start);
  if (range.end) q = q.lte("occurred_on", range.end);
  if (range.limit != null) q = q.limit(range.limit);

  const { data, error } = await q;
  // Fail closed: partial silence would zero totals and hide History.
  if (error || !data) {
    throw new Error(`Failed to load ${table}: ${error?.message ?? "no data"}`);
  }
  return data as T[];
}

async function fetchTransfers(
  supabase: SupabaseServer,
  range: FetchRange = {},
): Promise<HistoryEntry[]> {
  let q = supabase
    .from("transfers")
    .select(TRANSFER_HISTORY_SELECT)
    .order("moved_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.accountId) {
    // A Transfer belongs to both tills it touches.
    q = q.or(
      `source_account_id.eq.${range.accountId},target_account_id.eq.${range.accountId}`,
    );
  }
  if (range.start) q = q.gte("moved_on", range.start);
  if (range.end) q = q.lte("moved_on", range.end);
  if (range.limit != null) q = q.limit(range.limit);

  const { data, error } = await q;
  if (error || !data) {
    throw new Error(`Failed to load transfers: ${error?.message ?? "no data"}`);
  }
  return (data as TransferDbRow[]).map(mapTransferRow);
}

/** Recent mixed History for Home (Expenses + Incomes + Transfers). */
async function fetchRecent(
  supabase: SupabaseServer,
  selected: Account | null,
): Promise<HistoryEntry[]> {
  const accountId = selected?.id;
  const [expenses, incomes, transfers] = await Promise.all([
    fetchExpenses(supabase, { limit: RECENT_LIMIT * 2, accountId }),
    fetchIncomes(supabase, { limit: RECENT_LIMIT * 2, accountId }),
    fetchTransfers(supabase, { limit: RECENT_LIMIT * 2, accountId }),
  ]);

  return mergeHistory([...expenses, ...incomes, ...transfers]).slice(
    0,
    RECENT_LIMIT,
  );
}

function totals(expenseTotal: number, incomeTotal: number): MonthlyTotal {
  return {
    expenseTotal,
    incomeTotal,
    net: round2(incomeTotal - expenseTotal),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


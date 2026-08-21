import { cache } from "react";
import {
  currentYearMonth,
  monthDateBounds,
} from "@/lib/dates/minsk-month";
import { remainderFromTotals } from "@/lib/opening/compute-remainder";
import type { Opening } from "@/lib/opening/types";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import type { HistoryItem, MonthlyTotal } from "./history-types";
import {
  EXPENSE_HISTORY_SELECT,
  INCOME_HISTORY_SELECT,
  mapExpenseRow,
  mapIncomeRow,
  type ExpenseDbRow,
  type IncomeDbRow,
} from "./map-row";
import { mergeHistory } from "./merge-history";
import { computeMonthlyTotal } from "./monthly-total";

const RECENT_LIMIT = 5;

export type HomeMoney = {
  yearMonth: string;
  totals: MonthlyTotal;
  recent: HistoryItem[];
  opening: Opening | null;
  remainder: number | null;
};

export type MonthMoney = {
  yearMonth: string;
  totals: MonthlyTotal;
  items: HistoryItem[];
};

/**
 * Home: Remainder (if Opening exists) + current-month totals + recent History.
 */
export const loadHomeMoney = cache(async (): Promise<HomeMoney> => {
  const yearMonth = currentYearMonth();
  const { start, end } = monthDateBounds(yearMonth);
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) {
    return emptyHome(yearMonth);
  }

  // Month totals need full month rows; recent needs mixed latest overall.
  const [monthExpenses, monthIncomes, recentExpenses, recentIncomes, opening] =
    await Promise.all([
      fetchExpenses(supabase, { start, end }),
      fetchIncomes(supabase, { start, end }),
      fetchExpenses(supabase, { limit: RECENT_LIMIT * 2 }),
      fetchIncomes(supabase, { limit: RECENT_LIMIT * 2 }),
      fetchOpening(supabase),
    ]);

  const monthItems = mergeHistory(monthExpenses, monthIncomes);
  const recent = mergeHistory(recentExpenses, recentIncomes).slice(
    0,
    RECENT_LIMIT,
  );

  // Remainder is a live sum, not a page of History. Data API max_rows
  // (1000) would silently drop later committed rows if we selected them
  // and treated the truncated list as the full window.
  let remainder: number | null = null;
  if (opening) {
    const [expenseTotal, incomeTotal] = await Promise.all([
      fetchCommittedAmountTotal(supabase, "expenses", opening.openedOn),
      fetchCommittedAmountTotal(supabase, "incomes", opening.openedOn),
    ]);
    remainder = remainderFromTotals(opening, incomeTotal, expenseTotal);
  }

  return {
    yearMonth,
    totals: computeMonthlyTotal(monthItems),
    recent,
    opening,
    remainder,
  };
});

/**
 * Full mixed History for the «Все» surface (committed Expenses + Incomes).
 */
export const loadHistory = cache(async (): Promise<HistoryItem[]> => {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) return [];

  const [expenses, incomes] = await Promise.all([
    fetchExpenses(supabase),
    fetchIncomes(supabase),
  ]);
  return mergeHistory(expenses, incomes);
});

/**
 * Month tab: live Monthly total for a calendar month (default: current Europe/Minsk).
 */
export const loadMonthMoney = cache(
  async (yearMonth: string = currentYearMonth()): Promise<MonthMoney> => {
    const { start, end } = monthDateBounds(yearMonth);
    const supabase = await createClient();
    const user = userFromGetUserResult(await supabase.auth.getUser());
    if (!user) {
      return {
        yearMonth,
        totals: { expenseTotal: 0, incomeTotal: 0, net: 0 },
        items: [],
      };
    }

    const [expenses, incomes] = await Promise.all([
      fetchExpenses(supabase, { start, end }),
      fetchIncomes(supabase, { start, end }),
    ]);
    const items = mergeHistory(expenses, incomes);
    return {
      yearMonth,
      totals: computeMonthlyTotal(items),
      items,
    };
  },
);

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type FetchRange = {
  start?: string;
  end?: string;
  limit?: number;
};

async function fetchExpenses(
  supabase: SupabaseServer,
  range: FetchRange = {},
): Promise<HistoryItem[]> {
  let q = supabase
    .from("expenses")
    .select(EXPENSE_HISTORY_SELECT)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.start) q = q.gte("occurred_on", range.start);
  if (range.end) q = q.lte("occurred_on", range.end);
  if (range.limit != null) q = q.limit(range.limit);

  const { data, error } = await q;
  // Fail closed: never treat query errors as an empty month/history.
  // Partial silence would zero Monthly totals and hide History without notice.
  if (error || !data) {
    throw new Error(
      `Failed to load expenses: ${error?.message ?? "no data"}`,
    );
  }
  return (data as ExpenseDbRow[]).map(mapExpenseRow);
}

async function fetchIncomes(
  supabase: SupabaseServer,
  range: FetchRange = {},
): Promise<HistoryItem[]> {
  let q = supabase
    .from("incomes")
    .select(INCOME_HISTORY_SELECT)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.start) q = q.gte("occurred_on", range.start);
  if (range.end) q = q.lte("occurred_on", range.end);
  if (range.limit != null) q = q.limit(range.limit);

  const { data, error } = await q;
  if (error || !data) {
    throw new Error(
      `Failed to load incomes: ${error?.message ?? "no data"}`,
    );
  }
  return (data as IncomeDbRow[]).map(mapIncomeRow);
}

async function fetchCommittedAmountTotal(
  supabase: SupabaseServer,
  table: "expenses" | "incomes",
  startOn: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select("amount.sum()")
    .gte("occurred_on", startOn);

  if (error || !data) {
    throw new Error(
      `Failed to load ${table} total: ${error?.message ?? "no data"}`,
    );
  }
  const row = data[0] as { sum?: string | number | null } | undefined;
  return parseMoney(row?.sum);
}

function parseMoney(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

async function fetchOpening(supabase: SupabaseServer): Promise<Opening | null> {
  const { data, error } = await supabase
    .from("openings")
    .select("amount, opened_on")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load opening: ${error.message}`);
  }
  if (!data) return null;

  const amount =
    typeof data.amount === "number" ? data.amount : Number(data.amount);
  return {
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0,
    openedOn: data.opened_on as string,
  };
}

function emptyHome(yearMonth: string): HomeMoney {
  return {
    yearMonth,
    totals: { expenseTotal: 0, incomeTotal: 0, net: 0 },
    recent: [],
    opening: null,
    remainder: null,
  };
}

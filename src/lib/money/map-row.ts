import type { RateCurrency } from "@/lib/fx";
import type {
  AmountSnapshot,
  HistoryChannel,
  HistoryItem,
} from "./history-types";

/** Supabase `expenses` row (+ optional joined category name). */
export type ExpenseDbRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  created_at: string;
  category_id: string;
  account_id?: string | null;
  currency?: string | null;
  original_amount?: string | number | null;
  fx_rate?: string | number | null;
  categories:
    | { display_name: string }
    | { display_name: string }[]
    | null;
};

/** Supabase `incomes` row. */
export type IncomeDbRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  created_at: string;
  account_id?: string | null;
  currency?: string | null;
  original_amount?: string | number | null;
  fx_rate?: string | number | null;
};

export const EXPENSE_HISTORY_SELECT =
  "id, amount, occurred_on, note, channel, created_at, category_id, account_id, currency, original_amount, fx_rate, categories(display_name)" as const;

export const INCOME_HISTORY_SELECT =
  "id, amount, occurred_on, note, channel, created_at, account_id, currency, original_amount, fx_rate" as const;

export function mapExpenseRow(row: ExpenseDbRow): HistoryItem {
  return {
    id: row.id,
    kind: "expense",
    amount: parseNumeric(row.amount),
    snapshot: mapSnapshot(row),
    accountId: row.account_id ?? null,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    categoryId: row.category_id,
    categoryDisplayName: categoryName(row.categories),
    note: row.note,
    channel: parseChannel(row.channel, "manual"),
  };
}

export function mapIncomeRow(row: IncomeDbRow): HistoryItem {
  return {
    id: row.id,
    kind: "income",
    amount: parseNumeric(row.amount),
    snapshot: mapSnapshot(row),
    accountId: row.account_id ?? null,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    categoryId: null,
    categoryDisplayName: null,
    note: row.note,
    channel: parseChannel(row.channel, "manual"),
  };
}

export function parseChannel(
  raw: string,
  fallback: HistoryChannel,
): HistoryChannel {
  if (raw === "photo" || raw === "voice" || raw === "manual") return raw;
  return fallback;
}

/**
 * Native snapshot for a non-BYN row. Old rows read as BYN: absent/null
 * snapshot columns mean native BYN.
 */
export function mapSnapshot(row: {
  currency?: string | null;
  original_amount?: string | number | null;
  fx_rate?: string | number | null;
}): AmountSnapshot | null {
  const currency = snapshotCurrency(row.currency);
  if (!currency) return null;
  if (row.original_amount == null || row.fx_rate == null) return null;
  const originalAmount = parseNumeric(row.original_amount);
  // Rates keep four fraction digits (numeric(12,4)) — never round to 2.
  const fxRate = parseRate(row.fx_rate);
  if (originalAmount <= 0 || fxRate <= 0) return null;
  return { currency, originalAmount, fxRate };
}

function snapshotCurrency(
  raw: string | null | undefined,
): RateCurrency | null {
  return raw === "USD" || raw === "EUR" ? raw : null;
}

export function parseRate(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Number(`${n}e4`)) / 10_000;
}

export function parseNumeric(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function categoryName(
  categories: ExpenseDbRow["categories"],
): string | null {
  if (!categories) return null;
  if (Array.isArray(categories)) {
    return categories[0]?.display_name ?? null;
  }
  return categories.display_name ?? null;
}

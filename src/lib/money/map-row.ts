import type { HistoryChannel, HistoryItem } from "./history-types";

/** Supabase `expenses` row (+ optional joined category name). */
export type ExpenseDbRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  created_at: string;
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
};

export const EXPENSE_HISTORY_SELECT =
  "id, amount, occurred_on, note, channel, created_at, categories(display_name)" as const;

export const INCOME_HISTORY_SELECT =
  "id, amount, occurred_on, note, channel, created_at" as const;

export function mapExpenseRow(row: ExpenseDbRow): HistoryItem {
  return {
    id: row.id,
    kind: "expense",
    amount: parseNumeric(row.amount),
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
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
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    categoryDisplayName: null,
    note: row.note,
    channel: parseChannel(row.channel, "manual"),
  };
}

function parseChannel(
  raw: string,
  fallback: HistoryChannel,
): HistoryChannel {
  if (raw === "photo" || raw === "voice" || raw === "manual") return raw;
  return fallback;
}

function parseNumeric(value: string | number): number {
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

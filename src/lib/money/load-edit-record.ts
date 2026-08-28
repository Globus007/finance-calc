import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Account } from "@/lib/accounts/types";
import type { AmountSnapshot } from "./history-types";
import { createClient } from "@/lib/supabase/server";
import { categoriesForExpenseEdit } from "./edit-categories";
import type { EditRecordPageData, EditableRecord } from "./edit-types";
import type { HistoryChannel } from "./history-types";
import { listAccounts } from "@/lib/accounts/load-accounts";
import { getEffectiveRates } from "@/lib/fx";
import { mapSnapshot, parseChannel, parseNumeric } from "./map-row";

const EXPENSE_EDIT_SELECT =
  "id, amount, occurred_on, note, channel, category_id, account_id, currency, original_amount, fx_rate" as const;

const INCOME_EDIT_SELECT =
  "id, amount, occurred_on, note, channel, account_id, currency, original_amount, fx_rate" as const;

type ExpenseEditRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  category_id: string;
  account_id?: string | null;
  currency?: string | null;
  original_amount?: string | number | null;
  fx_rate?: string | number | null;
};

type IncomeEditRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  account_id?: string | null;
  currency?: string | null;
  original_amount?: string | number | null;
  fx_rate?: string | number | null;
};

/**
 * Load one committed record for Edit, plus Expense Category picker options and
 * the Account picker (with the rates the «≈» prefill needs).
 * Returns null when unauthenticated, kind invalid, or row missing.
 */
export async function loadEditRecord(
  kind: string,
  id: string,
): Promise<EditRecordPageData | null> {
  if (kind !== "expense" && kind !== "income") return null;
  if (!id) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const accounts = await listAccounts();

  if (kind === "expense") {
    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_EDIT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as ExpenseEditRow;
    const record = mapExpenseEdit(row);
    const [categories, rates] = await Promise.all([
      loadExpenseEditCategories(supabase, row.category_id),
      ratesForEdit(record, accounts),
    ]);
    return { record, categories, accounts, rates };
  }

  const { data, error } = await supabase
    .from("incomes")
    .select(INCOME_EDIT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const record = mapIncomeEdit(data as IncomeEditRow);
  return {
    record,
    categories: [],
    accounts,
    rates: await ratesForEdit(record, accounts),
  };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Rates the Edit form needs: only when the record (or one of the Accounts it
 * could move to) is non-BYN. BYN-only setups never touch NBRB (ADR-0013).
 */
async function ratesForEdit(record: EditableRecord, accounts: Account[]) {
  const needsRates =
    record.snapshot !== null || accounts.some((a) => a.currency !== "BYN");
  if (!needsRates) return {};
  return getEffectiveRates();
}

async function loadExpenseEditCategories(
  supabase: SupabaseServer,
  currentCategoryId: string,
): Promise<CategoryPickerItem[]> {
  const { data, error } = await supabase.from("categories").select(CATEGORY_SELECT);
  if (error || !data) {
    throw new Error(
      `Failed to load categories for edit: ${error?.message ?? "no data"}`,
    );
  }

  const rows = data.map(mapCategoryRow);
  const visible = sortCategoriesForManage(rows.filter((c) => !c.isHidden)).map(
    (c) => ({ id: c.id, displayName: c.displayName }),
  );

  const currentRow = rows.find((c) => c.id === currentCategoryId);
  const current: CategoryPickerItem | null = currentRow
    ? { id: currentRow.id, displayName: currentRow.displayName }
    : null;

  // Preserve seed/user manage order for visible, then append hidden current.
  return categoriesForExpenseEdit(visible, current);
}

function mapExpenseEdit(row: ExpenseEditRow): EditableRecord {
  return {
    id: row.id,
    kind: "expense",
    amount: parseNumeric(row.amount),
    snapshot: mapSnapshot(row),
    accountId: row.account_id ?? null,
    occurredOn: row.occurred_on,
    categoryId: row.category_id,
    note: row.note,
    channel: parseChannel(row.channel, "manual"),
  };
}

function mapIncomeEdit(row: IncomeEditRow): EditableRecord {
  return {
    id: row.id,
    kind: "income",
    amount: parseNumeric(row.amount),
    snapshot: mapSnapshot(row),
    accountId: row.account_id ?? null,
    occurredOn: row.occurred_on,
    categoryId: null,
    note: row.note,
    channel: parseChannel(row.channel, "manual"),
  };
}

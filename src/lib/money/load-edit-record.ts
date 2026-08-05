import {
  CATEGORY_SELECT,
  mapCategoryRow,
} from "@/lib/categories/map-row";
import { sortCategoriesForManage } from "@/lib/categories/sort-categories";
import type { CategoryPickerItem } from "@/lib/categories/types";
import { createClient } from "@/lib/supabase/server";
import { categoriesForExpenseEdit } from "./edit-categories";
import type { EditRecordPageData, EditableRecord } from "./edit-types";
import type { HistoryChannel } from "./history-types";

const EXPENSE_EDIT_SELECT =
  "id, amount, occurred_on, note, channel, category_id" as const;

const INCOME_EDIT_SELECT =
  "id, amount, occurred_on, note, channel" as const;

type ExpenseEditRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
  category_id: string;
};

type IncomeEditRow = {
  id: string;
  amount: string | number;
  occurred_on: string;
  note: string | null;
  channel: string;
};

/**
 * Load one committed record for Edit, plus Expense Category picker options.
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

  if (kind === "expense") {
    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_EDIT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as ExpenseEditRow;
    const record = mapExpenseEdit(row);
    const categories = await loadExpenseEditCategories(
      supabase,
      row.category_id,
    );
    return { record, categories };
  }

  const { data, error } = await supabase
    .from("incomes")
    .select(INCOME_EDIT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    record: mapIncomeEdit(data as IncomeEditRow),
    categories: [],
  };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

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
    occurredOn: row.occurred_on,
    categoryId: row.category_id,
    note: row.note,
    channel: parseChannel(row.channel),
  };
}

function mapIncomeEdit(row: IncomeEditRow): EditableRecord {
  return {
    id: row.id,
    kind: "income",
    amount: parseNumeric(row.amount),
    occurredOn: row.occurred_on,
    categoryId: null,
    note: row.note,
    channel: parseChannel(row.channel),
  };
}

function parseChannel(raw: string): HistoryChannel {
  if (raw === "photo" || raw === "voice" || raw === "manual") return raw;
  return "manual";
}

function parseNumeric(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}


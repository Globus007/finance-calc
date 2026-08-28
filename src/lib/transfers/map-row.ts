import type { TransferItem } from "@/lib/money/history-types";
import { parseNumeric, parseRate } from "@/lib/money/map-row";

/** Supabase `transfers` row (snake_case). */
export type TransferDbRow = {
  id: string;
  source_account_id: string;
  target_account_id: string;
  amount: string | number;
  converted_amount: string | number;
  fx_rate: string | number;
  moved_on: string;
  note: string | null;
  created_at: string;
};

export const TRANSFER_HISTORY_SELECT =
  "id, source_account_id, target_account_id, amount, converted_amount, fx_rate, moved_on, note, created_at" as const;

export function mapTransferRow(row: TransferDbRow): TransferItem {
  return {
    id: row.id,
    kind: "transfer",
    // Same sort key as Expenses/Incomes: the calendar day money moved.
    occurredOn: row.moved_on,
    createdAt: row.created_at,
    note: row.note,
    amount: parseNumeric(row.amount),
    convertedAmount: parseNumeric(row.converted_amount),
    fxRate: parseRate(row.fx_rate),
    sourceAccountId: row.source_account_id,
    targetAccountId: row.target_account_id,
  };
}

import { listAccounts } from "@/lib/accounts/load-accounts";
import type { Account } from "@/lib/accounts/types";
import { getEffectiveRates, type RateMap } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import { TRANSFER_HISTORY_SELECT, mapTransferRow, type TransferDbRow } from "./map-row";
import type { Transfer } from "./types";

/** Everything the Transfer Edit form needs. */
export type TransferEditData = {
  transfer: Transfer;
  accounts: Account[];
  rates: RateMap;
};

/**
 * Load one committed Transfer for Edit. Null when unauthenticated or missing
 * (RLS already scopes the row to its owner).
 */
export async function loadTransferForEdit(
  id: string,
): Promise<TransferEditData | null> {
  if (!id) return null;

  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) return null;

  const { data, error } = await supabase
    .from("transfers")
    .select(TRANSFER_HISTORY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const item = mapTransferRow(data as TransferDbRow);
  const accounts = await listAccounts();
  const needsRates = accounts.some(
    (a) =>
      a.currency !== "BYN" &&
      (a.id === item.sourceAccountId || a.id === item.targetAccountId),
  );

  const transfer: Transfer = {
    id: item.id,
    sourceAccountId: item.sourceAccountId,
    targetAccountId: item.targetAccountId,
    amount: item.amount,
    convertedAmount: item.convertedAmount,
    fxRate: item.fxRate,
    movedOn: item.occurredOn,
    note: item.note,
    createdAt: item.createdAt,
  };

  return {
    transfer,
    accounts,
    rates: needsRates ? await getEffectiveRates() : {},
  };
}

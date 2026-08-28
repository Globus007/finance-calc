import { todayInMinsk } from "@/lib/dates/minsk-today";
import type { Draft, DraftCurrency, RecordKind } from "./types";

/** Account prefill for manual capture: id + the Currency its Amount uses. */
export type ManualDraftAccount = { id: string; currency: DraftCurrency };

/**
 * Opens a manual Draft for confirm: empty Amount, no Category (Expense),
 * Occurred on = today Europe/Minsk, Channel = manual (ADR-0003). The picked
 * Account fixes the Currency of the typed Amount (ADR-0014).
 */
export function createManualDraft(
  kind: RecordKind,
  at: Date = new Date(),
  account?: ManualDraftAccount,
): Draft {
  return {
    kind,
    channel: "manual",
    amount: "",
    occurredOn: todayInMinsk(at),
    categoryId: "",
    note: "",
    accountId: account?.id ?? "",
    currency: account?.currency ?? "BYN",
  };
}

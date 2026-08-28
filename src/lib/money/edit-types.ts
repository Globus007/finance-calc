import type { Account } from "@/lib/accounts/types";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { RateMap } from "@/lib/fx";
import type {
  AmountSnapshot,
  HistoryChannel,
  HistoryKind,
} from "./history-types";

/**
 * Committed Expense or Income loaded for Edit (not a Draft).
 * Channel and kind are immutable after Commit.
 */
export type EditableRecord = {
  id: string;
  /** Expense | Income only — Transfers edit on their own surface. */
  kind: "expense" | "income";
  amount: number;
  /** Present when the record was typed in USD/EUR (prefills Amount in that Currency). */
  snapshot?: AmountSnapshot | null;
  /** Owning Account; the picker prefills this. */
  accountId?: string | null;
  /** YYYY-MM-DD */
  occurredOn: string;
  /** Expense Category id; null for Income. */
  categoryId: string | null;
  note: string | null;
  channel: HistoryChannel;
};

export type EditRecordPageData = {
  record: EditableRecord;
  /** Expense Edit picker (visible + current if hidden); empty for Income. */
  categories: CategoryPickerItem[];
  /** Accounts the record may move to (default first). */
  accounts: Account[];
  /** Rates behind the «≈» prefill when the Account changes Currency. */
  rates: RateMap;
};

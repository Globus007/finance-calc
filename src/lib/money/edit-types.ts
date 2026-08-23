import type { CategoryPickerItem } from "@/lib/categories/types";
import type {
  HistoryChannel,
  HistoryKind,
  UsdSnapshot,
} from "./history-types";

/**
 * Committed Expense or Income loaded for Edit (not a Draft).
 * Channel and kind are immutable after Commit.
 */
export type EditableRecord = {
  id: string;
  kind: HistoryKind;
  amount: number;
  /** Present when the record was entered in USD (prefills $ chip + typed amount). */
  usd?: UsdSnapshot | null;
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
};

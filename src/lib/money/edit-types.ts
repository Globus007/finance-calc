import type { CategoryPickerItem } from "@/lib/categories/types";
import type { HistoryChannel, HistoryKind } from "./history-types";

/**
 * Committed Expense or Income loaded for Edit (not a Draft).
 * Channel and kind are immutable after Commit.
 */
export type EditableRecord = {
  id: string;
  kind: HistoryKind;
  amount: number;
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

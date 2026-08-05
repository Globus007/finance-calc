import type { CategoryPickerItem } from "@/lib/categories/types";

/**
 * Expense Edit picker: all visible Categories, plus the committed Expense's
 * current Category when it is hidden (CONTEXT Unhide/Edit rule).
 * Channel and kind are not involved — Edit is not a return to Draft.
 */
export function categoriesForExpenseEdit(
  visible: readonly CategoryPickerItem[],
  current: CategoryPickerItem | null,
): CategoryPickerItem[] {
  if (!current) return [...visible];
  if (visible.some((c) => c.id === current.id)) return [...visible];
  return [...visible, current];
}

import type { HistoryItem } from "@/lib/money/history-types";
import type { Opening } from "./types";

/**
 * Live Remainder from Opening + already-filtered committed totals.
 * Absent Opening → null (not 0). Totals must exclude Drafts and any
 * record whose Occurred on is before the Opening date.
 */
export function remainderFromTotals(
  opening: Opening | null,
  incomeTotal: number,
  expenseTotal: number,
): number | null {
  if (opening === null) return null;
  return round2(opening.amount + incomeTotal - expenseTotal);
}

/**
 * Live Remainder over committed History items.
 * Absent Opening → null (not 0). Drafts must never appear in `items`.
 * Records with Occurred on before the Opening date do not move Remainder.
 */
export function computeRemainder(
  opening: Opening | null,
  items: HistoryItem[],
): number | null {
  if (opening === null) return null;

  let incomeTotal = 0;
  let expenseTotal = 0;
  for (const item of items) {
    if (item.occurredOn < opening.openedOn) continue;
    if (item.kind === "income") {
      incomeTotal += item.amount;
    } else {
      expenseTotal += item.amount;
    }
  }
  return remainderFromTotals(opening, incomeTotal, expenseTotal);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

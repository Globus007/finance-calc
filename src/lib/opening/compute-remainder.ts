import type { HistoryItem } from "@/lib/money/history-types";
import type { Opening } from "./types";

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

  let remainder = opening.amount;
  for (const item of items) {
    if (item.occurredOn < opening.openedOn) continue;
    if (item.kind === "income") {
      remainder += item.amount;
    } else {
      remainder -= item.amount;
    }
  }
  return round2(remainder);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

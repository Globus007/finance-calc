/**
 * Format a committed Amount for an edit form text field (dot decimal, 2 dp).
 * Independent of Russian display formatting (formatByn).
 */
export function formatAmountInput(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return (Math.round(amount * 100) / 100).toFixed(2);
}

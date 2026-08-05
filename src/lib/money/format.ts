/**
 * Format a BYN amount for Russian UI primary surfaces.
 * Always two fraction digits; narrow no-break space before Br.
 */
export function formatByn(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted}\u00a0Br`;
}

/**
 * Short Russian date for History rows from a bare YYYY-MM-DD calendar day.
 * Parses as UTC noon so the calendar day does not shift across timezones.
 */
export function formatShortDate(occurredOn: string): string {
  const d = new Date(`${occurredOn}T12:00:00.000Z`);
  return d.toLocaleDateString("ru-BY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

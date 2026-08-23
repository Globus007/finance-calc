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
 * Secondary approximate USD line for BYN figures (story #27):
 * whole dollars, minus sign kept, always the "≈" prefix.
 */
export function formatUsdApprox(bynAmount: number): string {
  if (!Number.isFinite(bynAmount)) return "≈\u00a0$0";
  const sign = bynAmount < 0 ? "−" : "";
  const dollars = Math.round(Math.abs(bynAmount));
  return `≈ ${sign}$${dollars.toLocaleString("ru-BY")}`;
}

/**
 * History badge for a record entered in USD (story #14):
 * "$50 · по 3,30" — original typed amount + rate fixed at commit.
 */
export function formatUsdBadge(
  snapshot: { originalAmount: number; fxRate: number },
): string {
  const amount = Number.isFinite(snapshot.originalAmount)
    ? snapshot.originalAmount
    : 0;
  const rate = Number.isFinite(snapshot.fxRate) ? snapshot.fxRate : 0;
  const whole = Number.isInteger(amount);
  const amountText = amount.toLocaleString("ru-BY", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  const rateText = rate.toLocaleString("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${amountText} · по ${rateText}`;
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

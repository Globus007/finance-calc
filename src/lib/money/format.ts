import type { AmountSnapshot } from "./history-types";
import type { Currency } from "@/lib/fx";

/** Symbol placed after the figure for BYN, before it for $ / €. */
export function currencySymbol(currency: Currency): string {
  return currency === "BYN" ? "\u00a0Br" : currency === "USD" ? "$" : "€";
}

/**
 * Format a BYN amount for Russian UI primary surfaces.
 * Always two fraction digits; narrow no-break space before Br.
 */
export function formatByn(amount: number): string {
  return `${formatNumber(amount)}\u00a0Br`;
}

/** Amount in its own Currency: "1 234,00 Br" / "$1 234,00" / "€1 234,00". */
export function formatMoney(amount: number, currency: Currency): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(amount);
  const body = `${formatNumber(abs)}${symbol}`;
  return amount < 0 ? `−${body}` : body;
}

/** Cross-Account BYN figure: always approximate («≈»). */
export function formatApproxByn(amount: number): string {
  if (!Number.isFinite(amount)) return "≈\u00a00,00\u00a0Br";
  const sign = amount < 0 ? "−" : "";
  return `≈ ${sign}${formatByn(Math.abs(amount))}`;
}

/**
 * Secondary approximate USD line for BYN figures (story #27):
 * whole dollars, minus sign kept, always the "≈" prefix.
 */
export function formatUsdApprox(bynAmount: number): string {
  return formatApproxIn("USD", bynAmount);
}

/** "≈ $412" / "≈ €380" / "≈ 1 250 Br" from a BYN figure (no rate math here). */
export function formatApproxIn(
  currency: Currency,
  bynAmount: number,
): string {
  if (!Number.isFinite(bynAmount)) return `≈ ${currencySymbol(currency)}0`;
  const sign = bynAmount < 0 ? "−" : "";
  const abs = Math.abs(bynAmount);
  const symbol = currencySymbol(currency);
  const body =
    currency === "BYN"
      ? `${formatNumber(abs)}${symbol}`
      : `${symbol}${Math.round(abs).toLocaleString("ru-BY")}`;
  return `≈ ${sign}${body}`;
}

/**
 * History badge for a record entered in USD/EUR (story #14):
 * "$50 · по 3,30" — original typed amount + rate fixed at commit.
 */
export function formatAmountBadge(snapshot: AmountSnapshot): string {
  const amount = Number.isFinite(snapshot.originalAmount)
    ? snapshot.originalAmount
    : 0;
  const rate = Number.isFinite(snapshot.fxRate) ? snapshot.fxRate : 0;
  const whole = Number.isInteger(amount);
  const symbol = currencySymbol(snapshot.currency);
  const amountText = `${symbol}${amount.toLocaleString("ru-BY", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
  const rateText = rate.toLocaleString("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amountText} · по ${rateText}`;
}

/** Short Russian date for History rows from a bare YYYY-MM-DD calendar day. */
export function formatShortDate(occurredOn: string): string {
  const d = new Date(`${occurredOn}T12:00:00.000Z`);
  return d.toLocaleDateString("ru-BY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatNumber(absAmount: number): string {
  return Math.abs(absAmount).toLocaleString("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

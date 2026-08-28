import type { Currency } from "@/lib/fx";
import {
  formatApproxByn,
  formatApproxIn,
  formatByn,
  formatMoney,
} from "./format";

/** Short Currency label for form fields and chips: "Br" | "$" | "€". */
export function currencyLabel(currency: Currency): string {
  return currency === "BYN" ? "Br" : currency === "USD" ? "$" : "€";
}

/**
 * Remainder figure: exact in the Account's Currency, or «≈» in BYN for the
 * cross-Account aggregate. Null renders the Set Opening prompt.
 */
export function remainderText(
  remainder: number | null,
  currency: Currency,
  approximate: boolean,
): string | null {
  if (remainder === null) return null;
  return approximate ? formatApproxByn(remainder) : formatMoney(remainder, currency);
}

/** Signed Monthly-total figure (income "+", expense "−"). */
export function signedTotalText(
  value: number,
  currency: Currency,
  sign: "+" | "−",
  approximate = false,
): string {
  const abs = Math.abs(value);
  const body = currency === "BYN" ? formatByn(abs) : formatMoney(abs, currency);
  return `${approximate ? "≈ " : ""}${sign}${body}`;
}

/** Secondary «≈ Br» line for a native figure; null when BYN needs no mirror. */
export function approxBynLine(
  bynAmount: number | null | undefined,
  currency: Currency,
): string | null {
  if (bynAmount == null || currency === "BYN") return null;
  return formatApproxIn("BYN", bynAmount);
}

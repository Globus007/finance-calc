import { MAX_COMMIT_AMOUNT, isValidCalendarDate } from "@/lib/draft/validate-commit";
import {
  isNegativeOpeningAmount,
  parseOpeningAmount,
} from "./parse-opening-amount";
import type {
  ProductCalendar,
  SetOpeningInput,
  SetOpeningValidation,
} from "./types";

/**
 * Set Opening rules: amount ≥ 0 (zero allowed), same numeric(12,2) max as Commit,
 * real calendar date, date ≤ injected tomorrow. First write and replacement
 * share this validation. Does not read the clock.
 */
export function validateSetOpening(
  input: SetOpeningInput,
  calendar: ProductCalendar,
): SetOpeningValidation {
  if (isNegativeOpeningAmount(input.amount)) {
    return { ok: false, reason: "amount_negative" };
  }

  const amount = parseOpeningAmount(input.amount);
  if (amount === null) {
    return { ok: false, reason: "amount_required" };
  }
  if (amount > MAX_COMMIT_AMOUNT) {
    return { ok: false, reason: "amount_too_large" };
  }

  const openedOn = input.openedOn.trim();
  if (!openedOn || !isValidCalendarDate(openedOn)) {
    return { ok: false, reason: "date_required" };
  }
  if (openedOn > calendar.tomorrow) {
    return { ok: false, reason: "date_after_tomorrow" };
  }

  return { ok: true, amount, openedOn };
}

import { isValidCalendarDate, MAX_COMMIT_AMOUNT, roundHalfUp2 } from "@/lib/draft/validate-commit";
import { isNoteTooLong, normalizeNote } from "@/lib/draft/normalize-note";
import { parseAmount } from "@/lib/draft/parse-amount";
import type { Account } from "@/lib/accounts/types";
import type { RateMap } from "@/lib/fx";
import { crossRate } from "@/lib/fx";
import type { TransferValidation } from "./types";

/**
 * Transfer validity (ADR-0014): two distinct own Accounts, Amount > 0 typed in
 * the source Currency, real Occurred on, optional Note. The target figure is
 * converted once at the injected cross rate — validation never fetches a rate.
 */
export function validateTransfer(
  input: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: string;
    movedOn: string;
    note: string;
  },
  ctx: {
    accounts: Account[];
    rates: RateMap;
  },
): TransferValidation {
  const sourceAccountId = input.sourceAccountId.trim();
  const targetAccountId = input.targetAccountId.trim();

  if (!sourceAccountId || !targetAccountId) {
    return { ok: false, reason: "account_not_found" };
  }
  if (sourceAccountId === targetAccountId) {
    return { ok: false, reason: "same_account" };
  }

  const source = ctx.accounts.find((a) => a.id === sourceAccountId);
  const target = ctx.accounts.find((a) => a.id === targetAccountId);
  if (!source || !target) {
    return { ok: false, reason: "account_not_found" };
  }

  if (isNoteTooLong(input.note)) {
    return { ok: false, reason: "note_too_long" };
  }

  const amount = parseAmount(input.amount);
  if (amount === null) return { ok: false, reason: "amount_required" };
  if (amount > MAX_COMMIT_AMOUNT) {
    return { ok: false, reason: "amount_too_large" };
  }

  const rate = crossRate(source.currency, target.currency, ctx.rates);
  if (rate === null) return { ok: false, reason: "rate_unavailable" };

  const convertedAmount = roundHalfUp2(amount * rate);
  if (convertedAmount > MAX_COMMIT_AMOUNT) {
    return { ok: false, reason: "amount_too_large" };
  }

  const movedOn = input.movedOn.trim();
  if (!movedOn || !isValidCalendarDate(movedOn)) {
    return { ok: false, reason: "date_required" };
  }

  return {
    ok: true,
    sourceAccountId,
    targetAccountId,
    amount,
    convertedAmount,
    fxRate: rate,
    movedOn,
    note: normalizeNote(input.note),
  };
}

import type { Currency } from "@/lib/fx";

/** One persisted Opening: counted money in one Account at a calendar date. */
export type Opening = {
  /** Owning Account (ADR-0014: one Opening per Account). */
  accountId: string;
  /** Amount in the Account's Currency (≥ 0). */
  amount: number;
  /** Opening calendar date as YYYY-MM-DD (Europe/Minsk “start of day”). */
  openedOn: string;
};

/** Opening + the Currency its amount is expressed in (for display). */
export type AccountOpening = Opening & { currency: Currency };

export type SetOpeningInput = {
  /** Target Account; the amount is typed in its Currency. */
  accountId: string;
  amount: string;
  openedOn: string;
};

export type SetOpeningRejection =
  | "amount_required"
  | "amount_negative"
  | "amount_too_large"
  | "date_required"
  | "date_after_tomorrow"
  | "account_not_found";

export type SetOpeningValidation =
  | { ok: true; amount: number; openedOn: string }
  | { ok: false; reason: SetOpeningRejection };

/** Injected product calendar — never read the clock inside validation. */
export type ProductCalendar = {
  today: string;
  tomorrow: string;
};

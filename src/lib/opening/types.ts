/** One persisted Opening: counted cash at the start of a calendar date. */
export type Opening = {
  /** BYN amount (≥ 0). */
  amount: number;
  /** Opening calendar date as YYYY-MM-DD (Europe/Minsk “start of day”). */
  openedOn: string;
};

export type SetOpeningInput = {
  amount: string;
  openedOn: string;
};

export type SetOpeningRejection =
  | "amount_required"
  | "amount_negative"
  | "amount_too_large"
  | "date_required"
  | "date_after_tomorrow";

export type SetOpeningValidation =
  | { ok: true; amount: number; openedOn: string }
  | { ok: false; reason: SetOpeningRejection };

/** Injected product calendar — never read the clock inside validation. */
export type ProductCalendar = {
  today: string;
  tomorrow: string;
};

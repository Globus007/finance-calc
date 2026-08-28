/** A committed Transfer between own Accounts (ADR-0014). */
export type Transfer = {
  id: string;
  sourceAccountId: string;
  targetAccountId: string;
  /** Amount as typed, in the source Account's Currency (> 0). */
  amount: number;
  /** Figure the target Account receives, in the target Account's Currency. */
  convertedAmount: number;
  /** Implied source→target rate fixed at the moment of the move. */
  fxRate: number;
  /** YYYY-MM-DD */
  movedOn: string;
  note: string | null;
  /** Commit time (ISO); tie-break for sort only. */
  createdAt: string;
};

/** Form payload for create / Edit of a Transfer. */
export type TransferInput = {
  sourceAccountId: string;
  targetAccountId: string;
  amount: string;
  movedOn: string;
  note: string;
};

export type TransferRejection =
  | "amount_required"
  | "amount_too_large"
  | "date_required"
  | "note_too_long"
  | "same_account"
  | "account_not_found"
  | "rate_unavailable";

export type TransferActionError =
  | TransferRejection
  | "unauthenticated"
  | "unavailable"
  | "not_found";

export type TransferValidation =
  | {
      ok: true;
      sourceAccountId: string;
      targetAccountId: string;
      amount: number;
      convertedAmount: number;
      fxRate: number;
      movedOn: string;
      note: string | null;
    }
  | { ok: false; reason: TransferRejection };

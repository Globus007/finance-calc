import type { Currency } from "@/lib/fx";
import { isCurrency } from "@/lib/fx";

/** A named till with one Currency, fixed at creation (ADR-0014). */
export type Account = {
  id: string;
  name: string;
  currency: Currency;
  isDefault: boolean;
};

/** Picker row: id + label parts, no persistence knowledge. */
export type AccountPickerItem = {
  id: string;
  name: string;
  currency: Currency;
  /** Marks the fast-capture target so the confirm sheet can prefill it. */
  isDefault: boolean;
};

export const MAX_ACCOUNT_NAME_LENGTH = 40;

/** Rejections shared by create / rename (pure, no I/O). */
export type AccountNameRejection = "name_required" | "name_too_long";

export type AccountNameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: AccountNameRejection };

/**
 * Account name rules: required after trim, bounded length, stored trimmed.
 * Does not read the database — uniqueness is not a domain rule (issue #85).
 */
export function validateAccountName(raw: string): AccountNameValidation {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, reason: "name_required" };
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    return { ok: false, reason: "name_too_long" };
  }
  return { ok: true, name };
}

/** Server trust boundary: only a known Currency code is accepted. */
export function parseAccountCurrency(raw: string): Currency | null {
  return isCurrency(raw) ? raw : null;
}

/** Rejections shared by create / rename / set-default / delete actions. */
export type AccountActionError =
  | "unauthenticated"
  | "unavailable"
  | "not_found"
  | "name_required"
  | "name_too_long"
  | "currency_invalid"
  | "currency_immutable"
  | "last_account"
  | "not_empty";

export type AccountMutationResult =
  | { status: "ok"; account: Account }
  | { status: "error"; reason: AccountActionError };

export type AccountDeleteResult =
  | { status: "ok"; id: string }
  | { status: "error"; reason: AccountActionError };

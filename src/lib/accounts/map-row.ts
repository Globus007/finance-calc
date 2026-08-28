import type { Currency } from "@/lib/fx";
import { parseAccountCurrency, type Account } from "./types";

/** Supabase `accounts` row (snake_case). */
export type AccountDbRow = {
  id: string;
  name: string;
  currency: string;
  is_default: boolean;
};

/** Shared select list for pickers, manage UI, and loaders. */
export const ACCOUNT_SELECT = "id, name, currency, is_default" as const;

export function mapAccountRow(row: AccountDbRow): Account {
  return {
    id: row.id,
    name: row.name,
    // Unknown code (never produced by the DB check) degrades to BYN.
    currency: parseAccountCurrency(row.currency) ?? "BYN",
    isDefault: row.is_default,
  };
}

export function isAccountCurrency(value: string): value is Currency {
  return parseAccountCurrency(value) !== null;
}

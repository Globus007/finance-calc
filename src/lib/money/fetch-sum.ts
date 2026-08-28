import { parseNumeric } from "./map-row";

/**
 * PostgREST Data API default `max_rows` (1000). A single uncapped select
 * silently truncates; page until a short page so Remainder / Monthly total
 * never drop committed rows.
 */
export const SUM_PAGE_SIZE = 1000;

export type SumColumn = "amount" | "original_amount";

export type SumFilter = {
  accountId?: string;
  from?: string;
  to?: string;
};

type SumRow = Record<string, string | number | null>;

export type SumResult = {
  data: SumRow[] | null;
  error: { message: string } | null;
};

/** Filter builder after `select` — `eq` / `gte` / `lte` / `range`. */
export type SumFilterQuery = {
  eq: (column: string, value: string) => SumFilterQuery;
  gte: (column: string, value: string) => SumFilterQuery;
  lte: (column: string, value: string) => SumFilterQuery;
  range: (from: number, to: number) => PromiseLike<SumResult>;
};

export type SumFrom = {
  select: (column: string) => SumFilterQuery;
};

export type SumClient = {
  from: (table: "expenses" | "incomes") => SumFrom;
};

export type TransferSumClient = {
  from: (table: "transfers") => SumFrom;
};

/** Per-Account Transfer flows in that Account's Currency, Opening-dated. */
export type TransferFlows = {
  /** converted_amount on rows whose target is this Account. */
  incoming: number;
  /** amount on rows whose source is this Account. */
  outgoing: number;
};

/**
 * Sum a money column over committed rows.
 *
 * Must not use PostgREST aggregate syntax (`amount.sum()`): production
 * Data API rejects it with "Use of aggregate functions is not allowed"
 * (`db-aggregates-enabled` is off). Page through rows instead.
 */
export async function fetchSum(
  // The real Supabase client is a deep generic; don't unify it with SumClient
  // or tsc hits "type instantiation is excessively deep".
  supabase: { from: (table: "expenses" | "incomes") => { select: (column: string) => any } },
  table: "expenses" | "incomes",
  column: SumColumn,
  filter: SumFilter,
): Promise<number> {
  let total = 0;
  let offset = 0;

  for (;;) {
    let q = supabase.from(table).select(column);
    if (filter.accountId) q = q.eq("account_id", filter.accountId);
    if (filter.from) q = q.gte("occurred_on", filter.from);
    if (filter.to) q = q.lte("occurred_on", filter.to);

    const { data, error } = await q.range(offset, offset + SUM_PAGE_SIZE - 1);
    if (error || !data) {
      throw new Error(
        `Failed to load ${table} total: ${error?.message ?? "no data"}`,
      );
    }

    for (const row of data) {
      const raw = row[column];
      if (raw == null) continue;
      total += parseNumeric(raw);
    }

    if (data.length < SUM_PAGE_SIZE) break;
    offset += SUM_PAGE_SIZE;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Incoming + outgoing Transfer totals for one Account (Remainder only —
 * Transfers never enter Monthly totals). `from` is the Opening date.
 */
export async function fetchTransferFlows(
  supabase: {
    from: (table: "transfers") => { select: (column: string) => any };
  },
  accountId: string,
  filter: { from?: string; to?: string },
): Promise<TransferFlows> {
  const [outgoing, incoming] = await Promise.all([
    pageTransferColumn(supabase, "amount", "source_account_id", accountId, filter),
    pageTransferColumn(
      supabase,
      "converted_amount",
      "target_account_id",
      accountId,
      filter,
    ),
  ]);
  return { outgoing, incoming };
}

async function pageTransferColumn(
  supabase: {
    from: (table: "transfers") => { select: (column: string) => any };
  },
  column: "amount" | "converted_amount",
  accountColumn: "source_account_id" | "target_account_id",
  accountId: string,
  filter: { from?: string; to?: string },
): Promise<number> {
  let total = 0;
  let offset = 0;

  for (;;) {
    let q = supabase.from("transfers").select(column).eq(accountColumn, accountId);
    if (filter.from) q = q.gte("moved_on", filter.from);
    if (filter.to) q = q.lte("moved_on", filter.to);

    const { data, error } = await q.range(offset, offset + SUM_PAGE_SIZE - 1);
    if (error || !data) {
      throw new Error(
        `Failed to load transfers total: ${error?.message ?? "no data"}`,
      );
    }

    for (const row of data) {
      const raw = row[column];
      if (raw == null) continue;
      total += parseNumeric(raw);
    }

    if (data.length < SUM_PAGE_SIZE) break;
    offset += SUM_PAGE_SIZE;
  }

  return Math.round(total * 100) / 100;
}

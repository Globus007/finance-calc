import { describe, expect, it } from "vitest";
import {
  SUM_PAGE_SIZE,
  fetchSum,
  fetchTransferFlows,
  type SumClient,
  type SumFilterQuery,
  type SumFrom,
  type SumResult,
  type TransferSumClient,
} from "./fetch-sum";

type Page = Record<string, string | number | null>[];

function clientFromPages(
  pages: Page[],
  selectCalls: string[] = [],
): SumClient {
  return {
    from: () => {
      const filter: SumFilterQuery = {
        eq: () => filter,
        gte: () => filter,
        lte: () => filter,
        range(from) {
          const pageIndex = from / SUM_PAGE_SIZE;
          const data = pages[pageIndex] ?? [];
          return Promise.resolve({ data, error: null } satisfies SumResult);
        },
      };
      const fromBuilder: SumFrom = {
        select(column) {
          selectCalls.push(column);
          if (column.includes("sum")) {
            return {
              ...filter,
              range: () =>
                Promise.resolve({
                  data: null,
                  error: {
                    message: "Use of aggregate functions is not allowed",
                  },
                }),
            };
          }
          return filter;
        },
      };
      return fromBuilder;
    },
  };
}

describe("fetchSum", () => {
  it("selects the raw column (not amount.sum()) so PostgREST aggregates stay off", async () => {
    const selectCalls: string[] = [];
    await fetchSum(clientFromPages([[{ amount: "10" }]], selectCalls), "incomes", "amount", {});
    expect(selectCalls).toEqual(["amount"]);
    expect(selectCalls.some((s) => s.includes("sum"))).toBe(false);
  });

  it("sums a column and pages past Data API max_rows", async () => {
    const first: Page = Array.from({ length: SUM_PAGE_SIZE }, () => ({
      amount: "1.00",
    }));
    const second: Page = [{ amount: "2.50" }, { amount: null }];
    const total = await fetchSum(
      clientFromPages([first, second]),
      "incomes",
      "amount",
      { accountId: "acc-1", from: "2026-08-01", to: "2026-08-31" },
    );
    expect(total).toBe(1002.5);
  });

  it("returns 0 when there are no rows", async () => {
    expect(await fetchSum(clientFromPages([[]]), "expenses", "amount", {})).toBe(
      0,
    );
  });

  it("fails closed on a query error", async () => {
    const filter = {} as SumFilterQuery;
    Object.assign(filter, {
      eq: () => filter,
      gte: () => filter,
      lte: () => filter,
      range: () =>
        Promise.resolve({
          data: null,
          error: { message: "permission denied" },
        }),
    });
    const supabase: SumClient = {
      from: () => ({ select: () => filter }),
    };

    await expect(
      fetchSum(supabase, "expenses", "original_amount", {}),
    ).rejects.toThrow("Failed to load expenses total: permission denied");
  });
});

describe("fetchTransferFlows", () => {
  it("sums outgoing source Amount and incoming converted Amount", async () => {
    function client(): TransferSumClient {
      return {
        from: () => {
          let selected = "";
          const filter: SumFilterQuery = {
            eq: () => filter,
            gte: () => filter,
            lte: () => filter,
            range() {
              const data =
                selected === "amount"
                  ? [{ amount: "30" }, { amount: "5" }]
                  : [{ converted_amount: "12.5" }];
              return Promise.resolve({ data, error: null });
            },
          };
          return {
            select(column: string) {
              selected = column;
              return filter;
            },
          };
        },
      };
    }

    expect(
      await fetchTransferFlows(client(), "acc-1", { from: "2026-08-01" }),
    ).toEqual({ outgoing: 35, incoming: 12.5 });
  });
});

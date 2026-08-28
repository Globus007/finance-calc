import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HistoryList } from "./history-list";
import type { HistoryItem } from "@/lib/money/history-types";

afterEach(() => {
  cleanup();
});

function expense(partial: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: "e1",
    kind: "expense",
    amount: 48.2,
    occurredOn: "2026-08-04",
    createdAt: "2026-08-04T12:00:00.000Z",
    categoryId: "cat-food",
    categoryDisplayName: "Продукты",
    note: "Евроопт",
    channel: "photo",
    snapshot: null,
    accountId: "acc-1",
    ...partial,
  };
}

function income(partial: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: "i1",
    kind: "income",
    amount: 2100,
    occurredOn: "2026-08-01",
    createdAt: "2026-08-01T12:00:00.000Z",
    categoryId: null,
    categoryDisplayName: null,
    note: "Зарплата",
    channel: "manual",
    snapshot: null,
    accountId: "acc-1",
    ...partial,
  };
}

describe("HistoryList", () => {
  it("shows empty Russian copy when there are no committed items", () => {
    render(<HistoryList entries={[]} />);
    expect(
      screen.getByText(/Пока нет записей/i),
    ).toBeInTheDocument();
  });

  it("renders mixed Expenses and Incomes with Russian labels", () => {
    render(<HistoryList entries={[expense(), income()]} />);

    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.getByText("Зарплата")).toBeInTheDocument();
    expect(screen.getByText(/фото/)).toBeInTheDocument();
    expect(screen.getByText(/вручную/)).toBeInTheDocument();
    // Amounts with sign prefix
    expect(screen.getByText(/−/)).toBeInTheDocument();
    expect(screen.getByText(/\+/)).toBeInTheDocument();
  });

  it("links each row to Edit / Delete for that committed record", () => {
    render(<HistoryList entries={[expense(), income()]} />);

    expect(
      screen.getByRole("link", { name: /Редактировать расход Продукты/i }),
    ).toHaveAttribute("href", "/history/expense/e1");
    expect(
      screen.getByRole("link", { name: /Редактировать доход Зарплата/i }),
    ).toHaveAttribute("href", "/history/income/i1");
  });
});

describe("HistoryList mixed view (ADR-0014)", () => {
  const usdAccount = {
    id: "acc-1",
    name: "Доллары",
    currency: "USD" as const,
    isDefault: false,
  };

  it("labels all-Account rows with canonical ≈ BYN", () => {
    render(
      <HistoryList
        entries={[
          expense({
            amount: 165,
            snapshot: { currency: "USD", originalAmount: 50, fxRate: 3.3012 },
          }),
        ]}
        accountById={{ "acc-1": usdAccount }}
        showAccountNames
      />,
    );

    expect(screen.getByText(/≈/)).toBeInTheDocument();
    expect(screen.getByText(/165/)).toBeInTheDocument();
    expect(screen.getByText(/\$50 · по 3,30/)).toBeInTheDocument();
    expect(screen.getByText(/Доллары/)).toBeInTheDocument();
  });
});

describe("HistoryList USD badge (ADR-0013)", () => {
  it("shows the original $ amount and rate for records entered in USD", () => {
    render(
      <HistoryList
        entries={[
          expense({
            amount: 165,
            snapshot: { currency: "USD", originalAmount: 50, fxRate: 3.3012 },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/\$50 · по 3,30/)).toBeInTheDocument();
  });

  it("shows no badge for native BYN records", () => {
    render(<HistoryList entries={[expense()]} />);

    expect(screen.queryByText(/· по /)).not.toBeInTheDocument();
  });
});

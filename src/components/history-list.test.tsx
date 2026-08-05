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
    categoryDisplayName: "Продукты",
    note: "Евроопт",
    channel: "photo",
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
    categoryDisplayName: null,
    note: "Зарплата",
    channel: "manual",
    ...partial,
  };
}

describe("HistoryList", () => {
  it("shows empty Russian copy when there are no committed items", () => {
    render(<HistoryList items={[]} />);
    expect(
      screen.getByText(/Пока нет записей/i),
    ).toBeInTheDocument();
  });

  it("renders mixed Expenses and Incomes with Russian labels", () => {
    render(<HistoryList items={[expense(), income()]} />);

    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.getByText("Зарплата")).toBeInTheDocument();
    expect(screen.getByText(/фото/)).toBeInTheDocument();
    expect(screen.getByText(/вручную/)).toBeInTheDocument();
    // Amounts with sign prefix
    expect(screen.getByText(/−/)).toBeInTheDocument();
    expect(screen.getByText(/\+/)).toBeInTheDocument();
  });
});

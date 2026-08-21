import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "./home-dashboard";
import type { HistoryItem } from "@/lib/money/history-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

const monthTotals = {
  expenseTotal: 60.7,
  incomeTotal: 2100,
  net: 2039.3,
};

function expense(): HistoryItem {
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
  };
}

describe("HomeDashboard", () => {
  it("shows Remainder, month tiles, and recent History without expense structure", () => {
    render(
      <HomeDashboard
        remainder={2139.3}
        opening={{ amount: 100, openedOn: "2026-08-10" }}
        monthTotals={monthTotals}
        recent={[expense()]}
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(screen.getByLabelText("Остаток")).toHaveTextContent(/2\s?139,30/);
    expect(screen.getByLabelText("Доходы за месяц")).toBeInTheDocument();
    expect(screen.getByLabelText("Расходы за месяц")).toBeInTheDocument();
    expect(screen.getByText("История")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Все" })).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getByRole("link", { name: "Категории" })).toHaveAttribute(
      "href",
      "/categories",
    );
    expect(screen.getByText("Продукты")).toBeInTheDocument();

    expect(screen.queryByText("Структура расходов")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Аналитика" }),
    ).not.toBeInTheDocument();
  });
});

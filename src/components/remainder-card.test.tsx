import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemainderCard } from "./remainder-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

const opening = { accountId: "acc-1", amount: 100, openedOn: "2026-08-10" };

const emptyMonth = { expenseTotal: 0, incomeTotal: 0, net: 0 };

describe("RemainderCard", () => {
  it("prompts Set Opening when Remainder is absent and does not show 0,00 as Remainder", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText={null}
        currencyLabel="BYN"
        opening={null}
        monthIncomeText="0,00"
        monthExpenseText="0,00"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    const remainder = screen.getByLabelText("Остаток");
    expect(remainder).toHaveTextContent("Задать старт");
    expect(remainder).not.toHaveTextContent("0,00");
    expect(screen.getByLabelText("Сумма старта · BYN")).toBeInTheDocument();
    expect(screen.getByLabelText("Дата старта")).toBeInTheDocument();
    expect(screen.queryByText(/баланс/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Доходы за месяц")).toBeInTheDocument();
    expect(screen.getByLabelText("Расходы за месяц")).toBeInTheDocument();
  });

  it("shows a positive Remainder figure and keeps month income/expense as secondary tiles", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="2 139,30"
        currencyLabel="BYN"
        opening={opening}
        monthIncomeText="2 100,00"
        monthExpenseText="60,70"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(screen.getByLabelText("Остаток")).toHaveTextContent(/2\s?139,30/);
    expect(screen.getByText("Остаток")).toBeInTheDocument();
    expect(screen.getByText(/2\s?100,00/)).toBeInTheDocument();
    expect(screen.getByText(/60,70/)).toBeInTheDocument();
    expect(screen.queryByText(/баланс/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Изменить старт" }),
    ).toBeInTheDocument();
  });

  it("shows a negative Remainder without blocking the surface", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="−30,00"
        currencyLabel="BYN"
        opening={{ accountId: "acc-1", amount: 20, openedOn: "2026-08-01" }}
        monthIncomeText="0,00"
        monthExpenseText="0,00"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(screen.getByLabelText("Остаток")).toHaveTextContent(/−/);
    expect(screen.getByLabelText("Остаток")).toHaveTextContent(/30,00/);
    expect(screen.queryByText(/баланс/i)).not.toBeInTheDocument();
  });

  it("shows the exact month totals, including grouped digits, kopecks, and Br", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="100,00"
        currencyLabel="BYN"
        opening={opening}
        monthIncomeText="+1 234 567,89 Br"
        monthExpenseText="−9 876 543,21 Br"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    const income = screen.getByLabelText("Доходы за месяц");
    const expense = screen.getByLabelText("Расходы за месяц");
    expect(income).toHaveTextContent(/\+1\s?234\s?567,89\s?Br/);
    expect(expense).toHaveTextContent(/−9\s?876\s?543,21\s?Br/);
    expect(income.querySelector(".truncate")).toBeNull();
    expect(expense.querySelector(".truncate")).toBeNull();
  });

  it("lets the user open Set Opening again when Opening already exists", async () => {
    const user = userEvent.setup();
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="100,00"
        currencyLabel="BYN"
        opening={opening}
        monthIncomeText="0,00"
        monthExpenseText="0,00"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(
      screen.queryByLabelText("Сумма старта · BYN"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Изменить старт" }));
    expect(screen.getByLabelText("Сумма старта · BYN")).toBeInTheDocument();
    expect(screen.getByLabelText("Дата старта")).toBeInTheDocument();
  });
});

describe("RemainderCard USD secondary line (ADR-0013)", () => {
  it("shows the ready-made ≈ $ line under the Remainder figure", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="2 139,30"
        approxText="≈ $2 139"
        currencyLabel="BYN"
        opening={opening}
        monthIncomeText="2 100,00"
        monthExpenseText="60,70"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(screen.getByText("≈ $2 139")).toBeInTheDocument();
  });

  it("shows no ≈ $ line when no rate was passed", () => {
    render(
      <RemainderCard
        accountId="acc-1"
        remainderText="2 139,30"
        currencyLabel="BYN"
        opening={opening}
        monthIncomeText="2 100,00"
        monthExpenseText="60,70"
        today="2026-08-14"
        tomorrow="2026-08-15"
      />,
    );

    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });
});

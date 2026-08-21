import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MonthlyTotalCard } from "./monthly-total-card";

afterEach(() => {
  cleanup();
});

describe("MonthlyTotalCard", () => {
  it("renders zeros for an empty month", () => {
    render(
      <MonthlyTotalCard
        totals={{ expenseTotal: 0, incomeTotal: 0, net: 0 }}
        showBars
      />,
    );

    expect(screen.getByLabelText("Нетто")).toBeInTheDocument();
    expect(screen.getByText("пусто")).toBeInTheDocument();
    // Three zero figures: net + income + expense (with +/− prefix on sides)
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Доходы")).toBeInTheDocument();
    expect(screen.getByText("Расходы")).toBeInTheDocument();
    expect(screen.getByText("Доходы − расходы за месяц")).toBeInTheDocument();
    expect(screen.queryByText(/баланс/i)).not.toBeInTheDocument();
    // Empty months must not draw stub comparison bars.
    expect(screen.getAllByText("Доходы")).toHaveLength(1);
    expect(screen.getAllByText("Расходы")).toHaveLength(1);
  });

  it("shows live net as income minus expense", () => {
    render(
      <MonthlyTotalCard
        totals={{ expenseTotal: 60.7, incomeTotal: 2100, net: 2039.3 }}
        caption="Нетто · август 2026"
      />,
    );

    expect(screen.getByText("Нетто · август 2026")).toBeInTheDocument();
    expect(screen.getByText("Доходы − расходы за месяц")).toBeInTheDocument();
    expect(screen.queryByText(/баланс/i)).not.toBeInTheDocument();
    expect(screen.getByText(/2\s?039,30/)).toBeInTheDocument();
    expect(screen.getByText(/2\s?100,00/)).toBeInTheDocument();
    expect(screen.getByText(/60,70/)).toBeInTheDocument();
    expect(screen.getByText("плюс")).toBeInTheDocument();
  });

  it("marks negative net months as минус when bars are shown", () => {
    render(
      <MonthlyTotalCard
        totals={{ expenseTotal: 100, incomeTotal: 20, net: -80 }}
        showBars
      />,
    );
    expect(screen.getByText("минус")).toBeInTheDocument();
  });
});

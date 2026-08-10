import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CategoryBreakdown } from "./category-breakdown";
import type { CategoryBreakdownRow } from "@/lib/money/category-breakdown";

afterEach(() => {
  cleanup();
});

const sampleRows: CategoryBreakdownRow[] = [
  {
    categoryDisplayName: "Продукты",
    amount: 58.2,
    shareOfExpenseTotal: 0.8232,
  },
  {
    categoryDisplayName: "Кафе",
    amount: 12.5,
    shareOfExpenseTotal: 0.1768,
  },
];

describe("CategoryBreakdown", () => {
  it("renders empty state when there are no rows", () => {
    render(<CategoryBreakdown rows={[]} />);
    expect(screen.getByLabelText("По категориям")).toBeInTheDocument();
    expect(
      screen.getByText("Нет расходов в этом месяце"),
    ).toBeInTheDocument();
  });

  it("lists Category name, amount, and share percent", () => {
    render(<CategoryBreakdown rows={sampleRows} />);

    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.getByText("Кафе")).toBeInTheDocument();
    expect(screen.getByText(/58,20/)).toBeInTheDocument();
    expect(screen.getByText(/12,50/)).toBeInTheDocument();
    expect(screen.getByText(/82,3%/)).toBeInTheDocument();
    expect(screen.getByText(/17,7%/)).toBeInTheDocument();
  });

  it("limits visible rows when limit is set", () => {
    render(<CategoryBreakdown rows={sampleRows} limit={1} title="Топ" />);
    expect(screen.getByLabelText("Топ")).toBeInTheDocument();
    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.queryByText("Кафе")).not.toBeInTheDocument();
  });
});

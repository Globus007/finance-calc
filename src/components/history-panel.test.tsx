import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HistoryPanel } from "./history-panel";
import type { CategoryPickerItem } from "@/lib/categories/types";
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
    ...partial,
  };
}

const categories: CategoryPickerItem[] = [
  { id: "cat-food", displayName: "Продукты" },
  { id: "cat-transport", displayName: "Транспорт" },
];

describe("HistoryPanel", () => {
  it("shows kind, category, and date filters in Russian", () => {
    render(
      <HistoryPanel
        items={[expense(), income()]}
        categories={categories}
      />,
    );

    expect(screen.getByLabelText("Фильтры истории")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Все" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Расходы" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Доходы" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Категория/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/С даты/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/По дату/i)).toBeInTheDocument();
  });

  it("filters list by kind Expense and keeps Edit links", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        items={[expense(), income()]}
        categories={categories}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Расходы" }));

    const list = screen.getByRole("list", { name: "История" });
    expect(within(list).getByText("Продукты")).toBeInTheDocument();
    expect(within(list).queryByText("Зарплата")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Редактировать расход Продукты/i }),
    ).toHaveAttribute("href", "/history/expense/e1");
  });

  it("disables Category filter when kind is Income", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        items={[expense(), income()]}
        categories={categories}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Доходы" }));

    expect(screen.getByLabelText(/Категория/i)).toBeDisabled();
    expect(screen.getByText(/У доходов нет категории/i)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "История" });
    expect(within(list).getByText("Зарплата")).toBeInTheDocument();
    expect(within(list).queryByText("Продукты")).not.toBeInTheDocument();
  });

  it("excludes Incomes when a Category is selected and documents it", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        items={[expense(), income()]}
        categories={categories}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Категория/i), "cat-food");

    const list = screen.getByRole("list", { name: "История" });
    expect(within(list).getByText("Продукты")).toBeInTheDocument();
    expect(within(list).queryByText("Зарплата")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Доходы скрыты: у них нет категории/i),
    ).toBeInTheDocument();
  });

  it("shows a clear empty state when filters match nothing", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        items={[expense({ categoryId: "cat-food" }), income()]}
        categories={categories}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/Категория/i),
      "cat-transport",
    );

    expect(
      screen.getByText(/Нет записей по выбранным фильтрам/i),
    ).toBeInTheDocument();
  });

  it("clears filters and restores the full list", async () => {
    const user = userEvent.setup();
    render(
      <HistoryPanel
        items={[expense(), income()]}
        categories={categories}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Расходы" }));
    expect(
      within(screen.getByRole("list", { name: "История" })).queryByText(
        "Зарплата",
      ),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));

    const list = screen.getByRole("list", { name: "История" });
    expect(within(list).getByText("Продукты")).toBeInTheDocument();
    expect(within(list).getByText("Зарплата")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Сбросить фильтры" }),
    ).not.toBeInTheDocument();
  });

  it("filters by inclusive Occurred on date range", async () => {
    const user = userEvent.setup();
    const items = [
      expense({ id: "e-early", occurredOn: "2026-08-01", note: "Рано" }),
      expense({
        id: "e-mid",
        occurredOn: "2026-08-10",
        note: "Середина",
        categoryDisplayName: "Транспорт",
        categoryId: "cat-transport",
      }),
      income({ id: "i-late", occurredOn: "2026-08-20", note: "Поздно" }),
    ];
    render(<HistoryPanel items={items} categories={categories} />);

    await user.type(screen.getByLabelText(/С даты/i), "2026-08-05");
    await user.type(screen.getByLabelText(/По дату/i), "2026-08-15");

    const list = screen.getByRole("list", { name: "История" });
    expect(within(list).getByText("Транспорт")).toBeInTheDocument();
    expect(within(list).queryByText("Рано")).not.toBeInTheDocument();
    expect(within(list).queryByText("Поздно")).not.toBeInTheDocument();
  });
});

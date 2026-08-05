import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditRecord } from "./edit-record";
import type { EditableRecord } from "@/lib/money/edit-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

const categories = [
  { id: "cat-products", displayName: "Продукты" },
  { id: "cat-other", displayName: "Прочее" },
  { id: "cat-hidden", displayName: "Скрытая" },
];

function expense(partial: Partial<EditableRecord> = {}): EditableRecord {
  return {
    id: "e1",
    kind: "expense",
    amount: 48.2,
    occurredOn: "2026-08-04",
    categoryId: "cat-products",
    note: "Евроопт",
    channel: "photo",
    ...partial,
  };
}

function income(partial: Partial<EditableRecord> = {}): EditableRecord {
  return {
    id: "i1",
    kind: "income",
    amount: 2100,
    occurredOn: "2026-08-01",
    categoryId: null,
    note: "Зарплата",
    channel: "manual",
    ...partial,
  };
}

describe("EditRecord", () => {
  it("shows Expense fields Amount, date, Category, Note; Channel read-only", () => {
    render(
      <EditRecord
        record={expense()}
        categories={categories}
        editFn={vi.fn()}
        deleteFn={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Редактирование расхода" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Сумма/i)).toHaveValue("48.20");
    expect(screen.getByLabelText(/^Дата$/i)).toHaveValue("2026-08-04");
    expect(screen.getByLabelText(/Категория/i)).toHaveValue("cat-products");
    expect(screen.getByLabelText(/Заметка/i)).toHaveValue("Евроопт");
    expect(screen.getByText(/фото/i)).toBeInTheDocument();
    expect(screen.getByText(/не меняется/i)).toBeInTheDocument();
    // Channel is not an editable control
    expect(screen.queryByRole("combobox", { name: /канал/i })).not.toBeInTheDocument();
  });

  it("shows Income fields without Category", () => {
    render(
      <EditRecord
        record={income()}
        categories={[]}
        editFn={vi.fn()}
        deleteFn={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Редактирование дохода" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Сумма/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Дата$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Заметка/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Категория/i)).not.toBeInTheDocument();
  });

  it("keeps a hidden current Category choosable in the Expense picker", () => {
    render(
      <EditRecord
        record={expense({ categoryId: "cat-hidden" })}
        categories={categories}
        editFn={vi.fn()}
        deleteFn={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/Категория/i);
    expect(select).toHaveValue("cat-hidden");
    expect(
      screen.getByRole("option", { name: "Скрытая" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Продукты" }),
    ).toBeInTheDocument();
  });

  it("submits Edit with updated fields; does not send channel mutation", async () => {
    const user = userEvent.setup();
    const editFn = vi.fn().mockResolvedValue({ status: "ok" });

    render(
      <EditRecord
        record={expense()}
        categories={categories}
        editFn={editFn}
        deleteFn={vi.fn()}
      />,
    );

    const amount = screen.getByLabelText(/Сумма/i);
    await user.clear(amount);
    await user.type(amount, "55.50");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(editFn).toHaveBeenCalledWith({
        id: "e1",
        kind: "expense",
        amount: "55.50",
        occurredOn: "2026-08-04",
        categoryId: "cat-products",
        note: "Евроопт",
      });
    });
  });

  it("hard-deletes after confirm", async () => {
    const user = userEvent.setup();
    const deleteFn = vi.fn().mockResolvedValue({ status: "ok" });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <EditRecord
        record={income()}
        categories={[]}
        editFn={vi.fn()}
        deleteFn={deleteFn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));

    await waitFor(() => {
      expect(deleteFn).toHaveBeenCalledWith("income", "i1");
    });
  });

  it("does not Delete when confirm is cancelled", async () => {
    const user = userEvent.setup();
    const deleteFn = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <EditRecord
        record={expense()}
        categories={categories}
        editFn={vi.fn()}
        deleteFn={deleteFn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(deleteFn).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createManualDraft } from "@/lib/draft/create-manual-draft";
import { ConfirmDraft } from "./confirm-draft";

afterEach(() => {
  cleanup();
});

const categories = [
  { id: "cat-products", displayName: "Продукты" },
  { id: "cat-other", displayName: "Прочее" },
];

describe("ConfirmDraft", () => {
  it("shows Expense fields Amount, Occurred on, Category, Note and hides Channel", () => {
    const draft = createManualDraft(
      "expense",
      new Date("2026-08-05T09:00:00.000Z"),
    );
    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Подтверждение расхода" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Сумма/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Дата$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Категория/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Заметка/i)).toBeInTheDocument();
    expect(screen.queryByText(/manual/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/канал/i)).not.toBeInTheDocument();
  });

  it("shows Income fields without Category", () => {
    const draft = createManualDraft(
      "income",
      new Date("2026-08-05T09:00:00.000Z"),
    );
    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Подтверждение дохода" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Сумма/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Дата$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Заметка/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Категория/i)).not.toBeInTheDocument();
  });

  it("disables Commit until Expense has Amount, date, and Category", async () => {
    const user = userEvent.setup();
    const draft = createManualDraft(
      "expense",
      new Date("2026-08-05T09:00:00.000Z"),
    );
    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );

    const submit = screen.getByRole("button", { name: "Сохранить" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Сумма/i), "25.50");
    expect(submit).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Категория/i), "cat-products");
    expect(submit).toBeEnabled();
  });

  it("calls onDiscard without Commit", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const commitFn = vi.fn();
    render(
      <ConfirmDraft
        initialDraft={createManualDraft(
          "income",
          new Date("2026-08-05T09:00:00.000Z"),
        )}
        categories={[]}
        onDiscard={onDiscard}
        onCommitted={vi.fn()}
        commitFn={commitFn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Отбросить" }));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(commitFn).not.toHaveBeenCalled();
  });

  it("on Commit success notifies parent without sending Channel (server-set)", async () => {
    const user = userEvent.setup();
    const onCommitted = vi.fn();
    const commitFn = vi.fn().mockResolvedValue({ status: "ok", id: "e1" });
    const draft = {
      ...createManualDraft("expense", new Date("2026-08-05T09:00:00.000Z")),
      amount: "10",
      categoryId: "cat-products",
    };

    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={onCommitted}
        commitFn={commitFn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(commitFn).toHaveBeenCalledWith({
        kind: "expense",
        amount: "10",
        occurredOn: "2026-08-05",
        categoryId: "cat-products",
        note: "",
      });
    });
    expect(commitFn.mock.calls[0][0]).not.toHaveProperty("channel");
    await waitFor(() => expect(onCommitted).toHaveBeenCalledOnce());
  });

  it("on Commit failure keeps Draft on confirm for retry", async () => {
    const user = userEvent.setup();
    const onCommitted = vi.fn();
    const commitFn = vi
      .fn()
      .mockResolvedValue({ status: "error", reason: "unavailable" });
    const draft = {
      ...createManualDraft("income", new Date("2026-08-05T09:00:00.000Z")),
      amount: "200",
    };

    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={[]}
        onDiscard={vi.fn()}
        onCommitted={onCommitted}
        commitFn={commitFn}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/Не удалось сохранить/i);
    expect(onCommitted).not.toHaveBeenCalled();
    // Draft fields still present for retry
    expect(screen.getByLabelText(/Сумма/i)).toHaveValue("200");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });

  it("voice: shows kind switch; Expense→Income drops Category", async () => {
    const user = userEvent.setup();
    const draft = {
      kind: "expense" as const,
      channel: "voice" as const,
      amount: "30",
      occurredOn: "2026-08-05",
      categoryId: "cat-products",
      note: "кофе",
    };

    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Расход" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText(/Категория/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Доход" }));

    expect(
      screen.getByRole("heading", { name: "Подтверждение дохода" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Категория/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Сумма/i)).toHaveValue("30");
    expect(screen.getByLabelText(/Заметка/i)).toHaveValue("кофе");
    // Income Commit needs no Category
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });

  it("voice: Income→Expense requires Category again", async () => {
    const user = userEvent.setup();
    const draft = {
      kind: "income" as const,
      channel: "voice" as const,
      amount: "100",
      occurredOn: "2026-08-05",
      categoryId: "",
      note: "зарплата",
    };

    render(
      <ConfirmDraft
        initialDraft={draft}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Расход" }));

    expect(
      screen.getByRole("heading", { name: "Подтверждение расхода" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Категория/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Категория/i), "cat-other");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });

  it("manual and photo do not show kind switch", () => {
    const { unmount } = render(
      <ConfirmDraft
        initialDraft={createManualDraft(
          "expense",
          new Date("2026-08-05T09:00:00.000Z"),
        )}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Доход" })).not.toBeInTheDocument();
    unmount();

    render(
      <ConfirmDraft
        initialDraft={{
          kind: "expense",
          channel: "photo",
          amount: "10",
          occurredOn: "2026-08-05",
          categoryId: "cat-other",
          note: "",
        }}
        categories={categories}
        onDiscard={vi.fn()}
        onCommitted={vi.fn()}
        commitFn={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Доход" })).not.toBeInTheDocument();
  });
});

describe("switchDraftKind", () => {
  it("is a pure ADR-0002 transform", async () => {
    const { switchDraftKind } = await import("./confirm-draft");
    const base = {
      kind: "expense" as const,
      channel: "voice" as const,
      amount: "12",
      occurredOn: "2026-08-05",
      categoryId: "cat-1",
      note: "x",
    };
    expect(switchDraftKind(base, "income")).toEqual({
      ...base,
      kind: "income",
      categoryId: "",
    });
    expect(switchDraftKind({ ...base, kind: "income", categoryId: "" }, "expense")).toEqual({
      ...base,
      kind: "expense",
      categoryId: "",
    });
  });
});

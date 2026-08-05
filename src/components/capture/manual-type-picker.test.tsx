import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualTypePicker } from "./manual-type-picker";

afterEach(() => {
  cleanup();
});

describe("ManualTypePicker", () => {
  it("offers Expense and Income and reports the pick", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<ManualTypePicker onPick={onPick} onDismiss={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Вручную" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Расход/i }));
    expect(onPick).toHaveBeenCalledWith("expense");

    onPick.mockClear();
    await user.click(screen.getByRole("button", { name: /Доход/i }));
    expect(onPick).toHaveBeenCalledWith("income");
  });

  it("dismisses without creating a Draft", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onPick = vi.fn();
    render(<ManualTypePicker onPick={onPick} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Отменить" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "./bottom-nav";

const openManual = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/capture/capture-flow", () => ({
  useCapture: () => ({
    openManual,
    isCaptureOpen: false,
  }),
}));

afterEach(() => {
  cleanup();
  openManual.mockClear();
});

describe("BottomNav chrome", () => {
  it("renders Russian Домой / Месяц tabs and capture dock labels", () => {
    render(<BottomNav />);

    expect(screen.getByText("Домой")).toBeInTheDocument();
    expect(screen.getByText("Месяц")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Фото чека" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Голосовая запись" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вручную" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Основная навигация" }),
    ).toBeInTheDocument();
  });

  it("opens manual capture from the pen control", async () => {
    const user = userEvent.setup();
    render(<BottomNav />);

    await user.click(screen.getByRole("button", { name: "Вручную" }));
    expect(openManual).toHaveBeenCalledOnce();
  });
});

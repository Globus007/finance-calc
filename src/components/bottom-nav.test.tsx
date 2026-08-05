import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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
});

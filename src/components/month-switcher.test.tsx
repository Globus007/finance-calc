import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MonthSwitcher } from "./month-switcher";

afterEach(() => {
  cleanup();
});

describe("MonthSwitcher", () => {
  it("shows the selected month label in Russian", () => {
    render(<MonthSwitcher yearMonth="2026-07" maxYearMonth="2026-08" />);

    expect(screen.getByText("Июль 2026")).toBeInTheDocument();
  });

  it("links previous and next to Month with ym query", () => {
    render(<MonthSwitcher yearMonth="2026-07" maxYearMonth="2026-08" />);

    const prev = screen.getByRole("link", { name: "Предыдущий месяц" });
    const next = screen.getByRole("link", { name: "Следующий месяц" });

    expect(prev).toHaveAttribute("href", "/month?ym=2026-06");
    expect(next).toHaveAttribute("href", "/month?ym=2026-08");
  });

  it("crosses year boundaries on prev/next hrefs", () => {
    render(<MonthSwitcher yearMonth="2026-01" maxYearMonth="2026-08" />);

    expect(
      screen.getByRole("link", { name: "Предыдущий месяц" }),
    ).toHaveAttribute("href", "/month?ym=2025-12");
    expect(
      screen.getByRole("link", { name: "Следующий месяц" }),
    ).toHaveAttribute("href", "/month?ym=2026-02");
  });

  it("disables next when viewing the current (max) month", () => {
    render(<MonthSwitcher yearMonth="2026-08" maxYearMonth="2026-08" />);

    expect(screen.getByRole("button", { name: "Следующий месяц" })).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "Следующий месяц" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Предыдущий месяц" }),
    ).toHaveAttribute("href", "/month?ym=2026-07");
  });
});

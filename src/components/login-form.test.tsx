import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/login/actions", () => ({
  requestLoginOtp: vi.fn(),
  verifyLoginOtp: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("LoginForm viewport chrome", () => {
  it("scrolls inside a viewport-locked pane outside AppShell", () => {
    const { container } = render(<LoginForm />);

    const pane = container.firstElementChild as HTMLElement;
    expect(pane.className).toContain("h-dvh");
    expect(pane.className).toContain("max-h-dvh");
    expect(pane.className).toContain("overflow-y-auto");
    expect(pane.className).not.toContain("min-h-dvh");
    expect(pane.className).not.toContain("overflow-hidden");

    expect(
      screen.getByRole("button", { name: "Получить код" }),
    ).toBeInTheDocument();
  });
});

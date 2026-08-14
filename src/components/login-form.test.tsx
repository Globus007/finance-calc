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

describe("LoginForm query errors", () => {
  it("does not describe an OAuth callback failure as a magic-link failure", () => {
    render(<LoginForm initialError="oauth" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "Не удалось войти через провайдера. Попробуйте ещё раз.",
    );
    expect(alert).not.toHaveTextContent("Не удалось войти по ссылке");
  });

  it("keeps the magic-link copy for error=auth", () => {
    render(<LoginForm initialError="auth" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось войти по ссылке. Запросите новый код и введите его здесь, в приложении.",
    );
  });
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

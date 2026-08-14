import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/capture/capture-flow", () => ({
  CaptureProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  CaptureLayer: () => null,
  useCapture: () => ({
    openManual: vi.fn(),
    openPhoto: vi.fn(),
    openVoice: vi.fn(),
    isCaptureOpen: false,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("AppShell viewport chrome", () => {
  it("pins BottomNav outside the scrolling content pane", () => {
    const { container } = render(
      <AppShell>
        <p>page body</p>
      </AppShell>,
    );

    const shell = container.firstElementChild as HTMLElement;
    expect(shell.className).toContain("h-dvh");
    expect(shell.className).toContain("overflow-hidden");
    expect(shell.className).not.toContain("min-h-dvh");

    const scrollPane = shell.querySelector("main");
    expect(scrollPane).not.toBeNull();
    expect(scrollPane?.className).toContain("overflow-y-auto");
    expect(scrollPane).toHaveTextContent("page body");

    const nav = screen.getByRole("navigation", { name: "Основная навигация" });
    expect(scrollPane?.contains(nav)).toBe(false);
    expect(shell.contains(nav)).toBe(true);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickCaptureActions } from "./quick-capture-actions";

const openManual = vi.fn();
const openPhoto = vi.fn();
const openVoice = vi.fn();

vi.mock("@/components/capture/capture-flow", () => ({
  useCapture: () => ({ openManual, openPhoto, openVoice }),
}));

afterEach(() => {
  cleanup();
  openManual.mockClear();
  openPhoto.mockClear();
  openVoice.mockClear();
});

describe("QuickCaptureActions", () => {
  it("shows all entry methods directly on the home screen", () => {
    render(<QuickCaptureActions />);

    expect(
      screen.getByRole("region", { name: "Быстрое добавление операции" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вручную: Расход" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Фото: Чек" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Голос: Сказать" })).toBeInTheDocument();
  });

  it("opens the associated capture path without navigation", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureActions />);

    await user.click(screen.getByRole("button", { name: "Вручную: Расход" }));
    await user.click(screen.getByRole("button", { name: "Фото: Чек" }));
    await user.click(screen.getByRole("button", { name: "Голос: Сказать" }));

    expect(openManual).toHaveBeenCalledOnce();
    expect(openPhoto).toHaveBeenCalledOnce();
    expect(openVoice).toHaveBeenCalledOnce();
  });
});

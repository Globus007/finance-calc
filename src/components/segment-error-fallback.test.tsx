import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentErrorFallback } from "./segment-error-fallback";

const { refresh, notify } = vi.hoisted(() => ({
  refresh: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@honeybadger-io/react", () => ({
  Honeybadger: { notify },
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  notify.mockClear();
});

const FAULT_441 =
  "Minified React error #441; visit https://react.dev/errors/441 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";

describe("SegmentErrorFallback", () => {
  it("does not report the React #441 digest wrapper to Honeybadger", () => {
    render(
      <SegmentErrorFallback
        title="Не удалось загрузить"
        description="Данные временно недоступны. Попробуйте ещё раз."
        error={Object.assign(new Error(FAULT_441), { digest: "abc123" })}
        reset={() => undefined}
      />,
    );

    expect(notify).not.toHaveBeenCalled();
  });

  it("reports a real client exception", () => {
    const error = new Error("useCapture must be used within CaptureProvider");
    render(
      <SegmentErrorFallback
        title="Что-то пошло не так"
        description="Произошла ошибка. Попробуйте ещё раз."
        error={error}
        reset={() => undefined}
      />,
    );

    expect(notify).toHaveBeenCalledWith(error);
  });

  it("refetches RSC data before resetting the boundary", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(
      <SegmentErrorFallback
        title="Не удалось загрузить"
        description="Данные временно недоступны. Попробуйте ещё раз."
        error={new Error(FAULT_441)}
        reset={reset}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

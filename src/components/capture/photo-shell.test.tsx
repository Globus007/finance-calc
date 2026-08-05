import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PHOTO_EXTRACTION_FAILURE,
  PHOTO_PRE_CAPTURE_MESSAGES,
  PHOTO_PROGRESS_LABEL,
} from "@/lib/capture/messages";
import { PhotoShell } from "./photo-shell";

afterEach(() => {
  cleanup();
});

describe("PhotoShell", () => {
  it("shows pick CTAs for camera and gallery", () => {
    render(
      <PhotoShell
        mode={{ name: "pick" }}
        onFile={vi.fn()}
        onCancelProgress={vi.fn()}
        onRecapture={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Фото чека" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Сделать фото" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Выбрать из галереи" }),
    ).toBeInTheDocument();
  });

  it("shows progress and Cancel (not Extraction failure)", () => {
    const onCancel = vi.fn();
    render(
      <PhotoShell
        mode={{ name: "progress" }}
        onFile={vi.fn()}
        onCancelProgress={onCancel}
        onRecapture={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(PHOTO_PROGRESS_LABEL)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Отмена" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows Extraction failure with recapture primary", async () => {
    const user = userEvent.setup();
    const onRecapture = vi.fn();
    render(
      <PhotoShell
        mode={{ name: "extract-fail" }}
        onFile={vi.fn()}
        onCancelProgress={vi.fn()}
        onRecapture={onRecapture}
        onDismiss={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: PHOTO_EXTRACTION_FAILURE.title }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: PHOTO_EXTRACTION_FAILURE.primaryCta }),
    );
    expect(onRecapture).toHaveBeenCalledOnce();
  });

  it("shows pre-capture offline message", () => {
    render(
      <PhotoShell
        mode={{ name: "pre-error", reason: "offline" }}
        onFile={vi.fn()}
        onCancelProgress={vi.fn()}
        onRecapture={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: PHOTO_PRE_CAPTURE_MESSAGES.offline.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(PHOTO_PRE_CAPTURE_MESSAGES.offline.body),
    ).toBeInTheDocument();
  });

  it("shows pre-capture insecure (HTTPS) message with gallery CTA", () => {
    render(
      <PhotoShell
        mode={{ name: "pre-error", reason: "insecure" }}
        onFile={vi.fn()}
        onCancelProgress={vi.fn()}
        onRecapture={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: PHOTO_PRE_CAPTURE_MESSAGES.insecure.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: PHOTO_PRE_CAPTURE_MESSAGES.insecure.primaryCta,
      }),
    ).toBeInTheDocument();
  });
});

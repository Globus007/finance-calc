import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VOICE_EXTRACTION_FAILURE,
  VOICE_PRE_CAPTURE_MESSAGES,
  VOICE_PROGRESS_LABEL,
  VOICE_READY_TITLE,
  VOICE_RECORD_CTA,
  VOICE_RECORDING_LABEL,
  VOICE_STOP_CTA,
} from "@/lib/capture/messages";
import { VoiceShell } from "./voice-shell";

afterEach(() => {
  cleanup();
});

const baseProps = {
  onRequestRecord: vi.fn(),
  onRecording: vi.fn(),
  onCancelProgress: vi.fn(),
  onRecapture: vi.fn(),
  onDismiss: vi.fn(),
};

describe("VoiceShell", () => {
  it("shows ready UI without auto-starting mic (Записать CTA)", () => {
    render(<VoiceShell mode={{ name: "ready" }} {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: VOICE_READY_TITLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: VOICE_RECORD_CTA }),
    ).toBeInTheDocument();
  });

  it("ready Записать asks parent to enter recording (no auto-mic on open)", async () => {
    const user = userEvent.setup();
    const onRequestRecord = vi.fn();
    render(
      <VoiceShell
        mode={{ name: "ready" }}
        {...baseProps}
        onRequestRecord={onRequestRecord}
      />,
    );
    await user.click(screen.getByRole("button", { name: VOICE_RECORD_CTA }));
    expect(onRequestRecord).toHaveBeenCalledOnce();
  });

  it("shows recording stop control", () => {
    render(<VoiceShell mode={{ name: "recording" }} {...baseProps} />);
    expect(screen.getByText(VOICE_RECORDING_LABEL)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: VOICE_STOP_CTA }),
    ).toBeInTheDocument();
  });

  it("shows progress and Cancel (not Extraction failure)", () => {
    render(<VoiceShell mode={{ name: "progress" }} {...baseProps} />);
    expect(screen.getByText(VOICE_PROGRESS_LABEL)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Отмена" }).length,
    ).toBeGreaterThan(0);
  });

  it("Extraction failure primary is recapture ready (not auto-mic)", async () => {
    const user = userEvent.setup();
    const onRecapture = vi.fn();
    render(
      <VoiceShell
        mode={{ name: "extract-fail" }}
        {...baseProps}
        onRecapture={onRecapture}
      />,
    );
    expect(
      screen.getByRole("heading", { name: VOICE_EXTRACTION_FAILURE.title }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: VOICE_EXTRACTION_FAILURE.primaryCta,
      }),
    );
    expect(onRecapture).toHaveBeenCalledOnce();
  });

  it("shows pre-capture permission message", () => {
    render(
      <VoiceShell
        mode={{ name: "pre-error", reason: "permission" }}
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: VOICE_PRE_CAPTURE_MESSAGES.permission.title,
      }),
    ).toBeInTheDocument();
  });

  it("shows pre-capture insecure (HTTPS) message", () => {
    render(
      <VoiceShell
        mode={{ name: "pre-error", reason: "insecure" }}
        {...baseProps}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: VOICE_PRE_CAPTURE_MESSAGES.insecure.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(VOICE_PRE_CAPTURE_MESSAGES.insecure.body),
    ).toBeInTheDocument();
  });
});

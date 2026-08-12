"use client";

import { useCallback, useEffect, useRef } from "react";
import { isCaptureSecureContext } from "@/lib/capture/constraints";
import {
  PHOTO_CANCEL_LABEL,
  PHOTO_EXTRACTION_FAILURE,
  PHOTO_PRE_CAPTURE_MESSAGES,
  PHOTO_PROGRESS_LABEL,
  type PhotoPreCaptureReason,
} from "@/lib/capture/messages";

export type PhotoShellMode =
  | { name: "pick" }
  | { name: "progress" }
  | { name: "pre-error"; reason: PhotoPreCaptureReason }
  | { name: "extract-fail" };

type Props = {
  mode: PhotoShellMode;
  onFile: (file: File) => void;
  onCancelProgress: () => void;
  onRecapture: () => void;
  onDismiss: () => void;
  /** Pre-capture permission failure (camera denied). */
  onPermissionDenied?: () => void;
  /** Device capture unavailable (no mediaDevices / other). */
  onCaptureUnavailable?: () => void;
  /** Non-HTTPS / non-localhost — getUserMedia blocked. */
  onInsecureContext?: () => void;
  /** Auto-open capture when entering pick (recapture / dock open). */
  autoOpenCapture?: boolean;
};

/**
 * Inline photo capture shell: pick/camera, progress+cancel, pre-capture errors,
 * Extraction failure → recapture (ADR-0008).
 */
export function PhotoShell({
  mode,
  onFile,
  onCancelProgress,
  onRecapture,
  onDismiss,
  onPermissionDenied,
  onCaptureUnavailable,
  onInsecureContext,
  autoOpenCapture = false,
}: Props) {
  const captureInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const openGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  /**
   * Probe camera permission before opening the capture file input so we can
   * surface a pre-capture permission error (ADR-0008) instead of a silent cancel.
   */
  const openCapture = useCallback(async () => {
    if (!isCaptureSecureContext()) {
      onInsecureContext?.();
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      // No mediaDevices: still offer file capture; if that fails, gallery.
      captureInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.getTracks().forEach((t) => t.stop());
      captureInputRef.current?.click();
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onPermissionDenied?.();
        return;
      }
      if (name === "NotFoundError" || name === "NotReadableError") {
        onCaptureUnavailable?.();
        return;
      }
      // Other errors: fall back to file input (may still open gallery on desktop).
      captureInputRef.current?.click();
    }
  }, [onPermissionDenied, onCaptureUnavailable, onInsecureContext]);

  useEffect(() => {
    if (mode.name === "pick" && autoOpenCapture) {
      // Defer so the input is mounted.
      const t = window.setTimeout(() => {
        void openCapture();
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [mode.name, autoOpenCapture, openCapture]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so the same path can be re-selected after recapture.
    e.target.value = "";
    if (file) onFile(file);
  }

  return (
    <div
      className="flex h-full flex-col bg-[#F5F7FC] text-[#172033]"
      role="dialog"
      aria-labelledby="photo-shell-title"
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={mode.name === "progress" ? onCancelProgress : onDismiss}
          className="rounded-xl px-2.5 py-2 text-xs font-bold text-[#697386] transition hover:bg-white active:scale-95"
        >
          {mode.name === "progress" ? PHOTO_CANCEL_LABEL : "Закрыть"}
        </button>
        <span className="w-14" />
      </header>

      {/* Hidden inputs: environment camera + gallery fallback */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onInputChange}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-10">
        {mode.name === "pick" ? (
          <PickBody
            onCapture={openCapture}
            onGallery={openGallery}
          />
        ) : null}

        {mode.name === "progress" ? (
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-[#818CF8]/25 border-t-[#4F46E5]"
              aria-hidden
            />
            <p
              id="photo-shell-title"
              className="text-base font-bold text-[#172033]"
            >
              {PHOTO_PROGRESS_LABEL}
            </p>
            <button
              type="button"
              onClick={onCancelProgress}
              className="mt-2 cursor-pointer rounded-xl px-3 py-2 text-sm font-bold text-[#4F46E5] transition hover:bg-white"
            >
              {PHOTO_CANCEL_LABEL}
            </button>
          </div>
        ) : null}

        {mode.name === "pre-error" ? (
          <ErrorBody
            title={PHOTO_PRE_CAPTURE_MESSAGES[mode.reason].title}
            body={PHOTO_PRE_CAPTURE_MESSAGES[mode.reason].body}
            primaryCta={PHOTO_PRE_CAPTURE_MESSAGES[mode.reason].primaryCta}
            onPrimary={() => {
              if (
                mode.reason === "permission" ||
                mode.reason === "unavailable" ||
                mode.reason === "insecure"
              ) {
                openGallery();
              } else {
                onRecapture();
              }
            }}
            onDismiss={onDismiss}
          />
        ) : null}

        {mode.name === "extract-fail" ? (
          <ErrorBody
            title={PHOTO_EXTRACTION_FAILURE.title}
            body={PHOTO_EXTRACTION_FAILURE.body}
            primaryCta={PHOTO_EXTRACTION_FAILURE.primaryCta}
            onPrimary={onRecapture}
            onDismiss={onDismiss}
          />
        ) : null}
      </div>
    </div>
  );
}

function PickBody({
  onCapture,
  onGallery,
}: {
  onCapture: () => void;
  onGallery: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <h1
        id="photo-shell-title"
        className="text-3xl font-bold tracking-[-0.05em] text-[#172033]"
      >
        Фото чека
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-[#697386]">
        Сфотографируйте чек или выберите снимок. Фото не сохраняется после
        распознавания.
      </p>
      <button
        type="button"
        onClick={onCapture}
        className="mt-3 w-full cursor-pointer rounded-2xl bg-gradient-to-br from-[#FB923C] to-[#E66B43] py-4 text-sm font-bold text-white shadow-[0_14px_24px_-12px_rgba(230,107,67,0.50)] transition hover:brightness-105 active:scale-[0.99]"
      >
        Сделать фото
      </button>
      <button
        type="button"
        onClick={onGallery}
        className="w-full cursor-pointer rounded-2xl border border-white/85 bg-white/85 py-3.5 text-sm font-bold text-[#172033] shadow-[0_12px_22px_-20px_rgba(23,32,51,0.35)] transition hover:bg-white active:scale-[0.99]"
      >
        Выбрать из галереи
      </button>
    </div>
  );
}

function ErrorBody({
  title,
  body,
  primaryCta,
  onPrimary,
  onDismiss,
}: {
  title: string;
  body: string;
  primaryCta: string;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <h1
        id="photo-shell-title"
        className="text-2xl font-bold tracking-[-0.04em] text-[#172033]"
      >
        {title}
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-[#697386]">{body}</p>
      <button
        type="button"
        onClick={onPrimary}
        className="mt-3 w-full cursor-pointer rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#3730A3] py-4 text-sm font-bold text-white shadow-[0_14px_24px_-12px_rgba(79,70,229,0.60)] transition hover:brightness-105 active:scale-[0.99]"
      >
        {primaryCta}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full cursor-pointer rounded-xl py-2 text-sm font-bold text-[#697386] transition hover:bg-white"
      >
        На главную
      </button>
    </div>
  );
}

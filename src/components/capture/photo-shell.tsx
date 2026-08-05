"use client";

import { useCallback, useEffect, useRef } from "react";
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
  }, [onPermissionDenied, onCaptureUnavailable]);

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
      className="flex h-full flex-col bg-[#F3F0FA]"
      role="dialog"
      aria-labelledby="photo-shell-title"
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={mode.name === "progress" ? onCancelProgress : onDismiss}
          className="cursor-pointer text-xs font-semibold text-[#1A1B2E]/45"
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
              className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B6CFF]/25 border-t-[#5B6CFF]"
              aria-hidden
            />
            <p
              id="photo-shell-title"
              className="text-base font-semibold text-[#1A1B2E]"
            >
              {PHOTO_PROGRESS_LABEL}
            </p>
            <button
              type="button"
              onClick={onCancelProgress}
              className="mt-2 cursor-pointer text-sm font-semibold text-[#5B6CFF]"
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
                mode.reason === "unavailable"
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
        className="text-2xl font-bold tracking-tight text-[#1A1B2E]"
      >
        Фото чека
      </h1>
      <p className="text-sm text-[#1A1B2E]/55">
        Сфотографируйте чек или выберите снимок. Фото не сохраняется после
        распознавания.
      </p>
      <button
        type="button"
        onClick={onCapture}
        className="mt-2 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#FF8A4C] to-[#F97316] py-4 text-sm font-bold text-white shadow-lg shadow-[#FF8A4C]/30 transition active:scale-[0.99]"
      >
        Сделать фото
      </button>
      <button
        type="button"
        onClick={onGallery}
        className="w-full cursor-pointer rounded-2xl bg-white py-3.5 text-sm font-semibold text-[#1A1B2E] ring-1 ring-[#1A1B2E]/10 transition active:scale-[0.99]"
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
        className="text-xl font-bold tracking-tight text-[#1A1B2E]"
      >
        {title}
      </h1>
      <p className="text-sm text-[#1A1B2E]/55">{body}</p>
      <button
        type="button"
        onClick={onPrimary}
        className="mt-3 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 transition active:scale-[0.99]"
      >
        {primaryCta}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full cursor-pointer py-2 text-sm font-semibold text-[#1A1B2E]/45"
      >
        На главную
      </button>
    </div>
  );
}

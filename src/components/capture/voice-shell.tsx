"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isCaptureSecureContext } from "@/lib/capture/constraints";
import {
  VOICE_CANCEL_LABEL,
  VOICE_EXTRACTION_FAILURE,
  VOICE_PRE_CAPTURE_MESSAGES,
  VOICE_PROGRESS_LABEL,
  VOICE_READY_BODY,
  VOICE_READY_TITLE,
  VOICE_RECORD_CTA,
  VOICE_RECORDING_LABEL,
  VOICE_STOP_CTA,
  type VoicePreCaptureReason,
} from "@/lib/capture/messages";
import {
  VOICE_MAX_SECONDS,
  pickRecorderMimeType,
} from "@/lib/capture/voice-limits";
import { IconMic } from "@/components/icons";

export type VoiceShellMode =
  | { name: "ready" }
  | { name: "recording" }
  | { name: "progress" }
  | { name: "pre-error"; reason: VoicePreCaptureReason }
  | { name: "extract-fail" };

type Props = {
  mode: VoiceShellMode;
  /** User pressed record on ready UI — parent sets mode to recording. */
  onRequestRecord: () => void;
  /** Finished Recording blob; parent runs pipeline (no retained playback). */
  onRecording: (blob: Blob, mimeType: string) => void;
  onCancelProgress: () => void;
  /** Recapture: ready UI, do not auto-start mic (ADR-0008). */
  onRecapture: () => void;
  onDismiss: () => void;
  onPermissionDenied?: () => void;
  onCaptureUnavailable?: () => void;
  onInsecureContext?: () => void;
};

/**
 * Inline voice capture shell: ready (no auto-mic), recording, progress+cancel,
 * pre-capture errors, Extraction failure → ready recapture (ADR-0008).
 */
export function VoiceShell({
  mode,
  onRequestRecord,
  onRecording,
  onCancelProgress,
  onRecapture,
  onDismiss,
  onPermissionDenied,
  onCaptureUnavailable,
  onInsecureContext,
}: Props) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<string>("audio/webm");
  const [elapsedSec, setElapsedSec] = useState(0);
  // Avoid double-start when effect re-runs while recorder is starting.
  const startingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const cleanupRecorder = useCallback(() => {
    clearTimers();
    startingRef.current = false;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.ondataavailable = null;
        rec.onstop = null;
        rec.onerror = null;
        rec.stop();
      } catch {
        // already stopped
      }
    }
    stopTracks();
    chunksRef.current = [];
  }, [clearTimers, stopTracks]);

  useEffect(() => {
    return () => {
      cleanupRecorder();
    };
  }, [cleanupRecorder]);

  // Drop mic when leaving the recording surface without a finished blob
  // (ready / pre-error / extract-fail). Progress keeps no live tracks.
  useEffect(() => {
    if (
      mode.name === "ready" ||
      mode.name === "pre-error" ||
      mode.name === "extract-fail"
    ) {
      cleanupRecorder();
    }
  }, [mode.name, cleanupRecorder]);

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      stopTracks();
      clearTimers();
      return;
    }
    clearTimers();
    try {
      rec.stop();
    } catch {
      stopTracks();
    }
  }, [clearTimers, stopTracks]);

  const startRecording = useCallback(async () => {
    if (startingRef.current || recorderRef.current) return;
    startingRef.current = true;

    if (!isCaptureSecureContext()) {
      startingRef.current = false;
      onInsecureContext?.();
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      startingRef.current = false;
      onCaptureUnavailable?.();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Cancelled (dismiss / left recording surface) while awaiting permission:
      // cleanupRecorder resets startingRef, so we must not resurrect the mic or
      // feed a late Blob into the pipeline (ADR-0005).
      if (!startingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      const mime = pickRecorderMimeType();
      mimeRef.current = mime || "audio/webm";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTimers();
        stopTracks();
        startingRef.current = false;
        const blobType = recorder.mimeType || mimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        recorderRef.current = null;
        // Confirm holds Draft fields only — no retained audio (ADR-0005).
        onRecording(blob, blobType);
      };

      recorder.onerror = () => {
        cleanupRecorder();
        onCaptureUnavailable?.();
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setElapsedSec(0);

      tickTimerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSec(Math.min(sec, VOICE_MAX_SECONDS));
      }, 250);

      stopTimerRef.current = window.setTimeout(() => {
        finishRecording();
      }, VOICE_MAX_SECONDS * 1000);
    } catch (err) {
      startingRef.current = false;
      stopTracks();
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onPermissionDenied?.();
        return;
      }
      onCaptureUnavailable?.();
    }
  }, [
    cleanupRecorder,
    clearTimers,
    finishRecording,
    onCaptureUnavailable,
    onInsecureContext,
    onPermissionDenied,
    onRecording,
    stopTracks,
  ]);

  /**
   * User presses Записать: flip parent to recording UI, then open mic.
   * Start is intentional (not an effect) so recapture never auto-starts mic.
   */
  const onRecordClick = useCallback(() => {
    onRequestRecord();
    void startRecording();
  }, [onRequestRecord, startRecording]);

  const displayElapsed = mode.name === "recording" ? elapsedSec : 0;

  return (
    <div
      className="flex h-full flex-col bg-[#F3F0FA]"
      role="dialog"
      aria-labelledby="voice-shell-title"
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={
            mode.name === "progress"
              ? onCancelProgress
              : mode.name === "recording"
                ? () => {
                    cleanupRecorder();
                    onDismiss();
                  }
                : onDismiss
          }
          className="cursor-pointer text-xs font-semibold text-[#1A1B2E]/45"
        >
          {mode.name === "progress" || mode.name === "recording"
            ? VOICE_CANCEL_LABEL
            : "Закрыть"}
        </button>
        <span className="w-14" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-10">
        {mode.name === "ready" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#5B6CFF]/15 to-[#4338CA]/10 text-[#5B6CFF]">
              <IconMic size={36} />
            </div>
            <h1
              id="voice-shell-title"
              className="text-2xl font-bold tracking-tight text-[#1A1B2E]"
            >
              {VOICE_READY_TITLE}
            </h1>
            <p className="text-sm text-[#1A1B2E]/55">{VOICE_READY_BODY}</p>
            <button
              type="button"
              onClick={onRecordClick}
              className="mt-2 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 transition active:scale-[0.99]"
            >
              {VOICE_RECORD_CTA}
            </button>
          </div>
        ) : null}

        {mode.name === "recording" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#5B6CFF]/20" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] text-white shadow-lg shadow-[#5B6CFF]/40">
                <IconMic size={32} />
              </span>
            </div>
            <p
              id="voice-shell-title"
              className="text-base font-semibold text-[#1A1B2E]"
              role="status"
              aria-live="polite"
            >
              {VOICE_RECORDING_LABEL}
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[#5B6CFF]">
              {formatElapsed(displayElapsed)} /{" "}
              {formatElapsed(VOICE_MAX_SECONDS)}
            </p>
            <button
              type="button"
              onClick={finishRecording}
              className="mt-2 w-full cursor-pointer rounded-2xl bg-[#EF4444] py-4 text-sm font-bold text-white shadow-lg shadow-[#EF4444]/30 transition active:scale-[0.99]"
            >
              {VOICE_STOP_CTA}
            </button>
          </div>
        ) : null}

        {mode.name === "progress" ? (
          <div
            className="flex flex-col items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B6CFF]/25 border-t-[#5B6CFF]"
              aria-hidden
            />
            <p
              id="voice-shell-title"
              className="text-base font-semibold text-[#1A1B2E]"
            >
              {VOICE_PROGRESS_LABEL}
            </p>
            <button
              type="button"
              onClick={onCancelProgress}
              className="mt-2 cursor-pointer text-sm font-semibold text-[#5B6CFF]"
            >
              {VOICE_CANCEL_LABEL}
            </button>
          </div>
        ) : null}

        {mode.name === "pre-error" ? (
          <ErrorBody
            title={VOICE_PRE_CAPTURE_MESSAGES[mode.reason].title}
            body={VOICE_PRE_CAPTURE_MESSAGES[mode.reason].body}
            primaryCta={VOICE_PRE_CAPTURE_MESSAGES[mode.reason].primaryCta}
            onPrimary={
              mode.reason === "insecure" ? onDismiss : onRecapture
            }
            onDismiss={onDismiss}
          />
        ) : null}

        {mode.name === "extract-fail" ? (
          <ErrorBody
            title={VOICE_EXTRACTION_FAILURE.title}
            body={VOICE_EXTRACTION_FAILURE.body}
            primaryCta={VOICE_EXTRACTION_FAILURE.primaryCta}
            onPrimary={onRecapture}
            onDismiss={onDismiss}
          />
        ) : null}
      </div>
    </div>
  );
}

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
        id="voice-shell-title"
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

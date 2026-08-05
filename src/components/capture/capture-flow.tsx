"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { loadPickerCategories } from "@/app/(app)/capture/actions";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type {
  PhotoPreCaptureReason,
  VoicePreCaptureReason,
} from "@/lib/capture/messages";
import { runPhotoPipeline } from "@/lib/capture/run-photo-pipeline";
import { runVoicePipeline } from "@/lib/capture/run-voice-pipeline";
import { createManualDraft } from "@/lib/draft/create-manual-draft";
import type { Draft, RecordKind } from "@/lib/draft/types";
import { ConfirmDraft } from "./confirm-draft";
import { ManualTypePicker } from "./manual-type-picker";
import { PhotoShell, type PhotoShellMode } from "./photo-shell";
import { VoiceShell, type VoiceShellMode } from "./voice-shell";

type CapturePhase =
  | { name: "idle" }
  | { name: "manual-type" }
  | { name: "photo"; shell: PhotoShellMode; autoOpen: boolean }
  | { name: "voice"; shell: VoiceShellMode }
  | {
      name: "confirm";
      draft: Draft;
      categories: CategoryPickerItem[];
    };

type CaptureContextValue = {
  openManual: () => void;
  openPhoto: () => void;
  openVoice: () => void;
  isCaptureOpen: boolean;
  phase: CapturePhase;
  loadError: string | null;
  isOpeningConfirm: boolean;
  pickManualKind: (kind: RecordKind) => void;
  discard: () => void;
  onCommitted: () => void;
  onPhotoFile: (file: File) => void;
  cancelPhotoProgress: () => void;
  recapturePhoto: () => void;
  setPhotoPreError: (reason: PhotoPreCaptureReason) => void;
  requestVoiceRecord: () => void;
  onVoiceRecording: (blob: Blob, mimeType: string) => void;
  cancelVoiceProgress: () => void;
  recaptureVoice: () => void;
  setVoicePreError: (reason: VoicePreCaptureReason) => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function useCapture(): CaptureContextValue {
  const ctx = useContext(CaptureContext);
  if (!ctx) {
    throw new Error("useCapture must be used within CaptureProvider");
  }
  return ctx;
}

/**
 * Shell-level capture: photo / voice pipelines + manual type pick → confirm.
 */
export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<CapturePhase>({ name: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpeningConfirm, startOpenConfirm] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const discard = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoadError(null);
    setPhase({ name: "idle" });
  }, []);

  const openManual = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoadError(null);
    setPhase({ name: "manual-type" });
  }, []);

  const openPhoto = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoadError(null);
    setPhase({
      name: "photo",
      shell: { name: "pick" },
      autoOpen: true,
    });
  }, []);

  const openVoice = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoadError(null);
    // Ready UI only — never auto-start mic (ADR-0008).
    setPhase({ name: "voice", shell: { name: "ready" } });
  }, []);

  const pickManualKind = useCallback((kind: RecordKind) => {
    setLoadError(null);

    // async-defer-await: Income has no Category — skip picker I/O
    if (kind === "income") {
      setPhase({
        name: "confirm",
        draft: createManualDraft("income"),
        categories: [],
      });
      return;
    }

    startOpenConfirm(async () => {
      const result = await loadPickerCategories();
      if (result.status !== "ok") {
        setLoadError(
          result.reason === "unauthenticated"
            ? "Войдите в аккаунт."
            : "Не удалось загрузить категории. Попробуйте ещё раз.",
        );
        setPhase({
          name: "confirm",
          draft: createManualDraft("expense"),
          categories: [],
        });
        return;
      }
      setPhase({
        name: "confirm",
        draft: createManualDraft("expense"),
        categories: result.categories,
      });
    });
  }, []);

  const onCommitted = useCallback(() => {
    setLoadError(null);
    setPhase({ name: "idle" });
    router.refresh();
  }, [router]);

  const cancelPhotoProgress = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Cancel is not Extraction failure (ADR-0008) — back to idle.
    setPhase({ name: "idle" });
  }, []);

  const recapturePhoto = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({
      name: "photo",
      shell: { name: "pick" },
      autoOpen: true,
    });
  }, []);

  const setPhotoPreError = useCallback((reason: PhotoPreCaptureReason) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({
      name: "photo",
      shell: { name: "pre-error", reason },
      autoOpen: false,
    });
  }, []);

  const onPhotoFile = useCallback(async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({
      name: "photo",
      shell: { name: "progress" },
      autoOpen: false,
    });

    const result = await runPhotoPipeline(file, { signal: controller.signal });

    if (controller.signal.aborted || result.status === "cancelled") {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase({ name: "idle" });
      }
      return;
    }

    abortRef.current = null;

    if (result.status === "ok") {
      setPhase({
        name: "confirm",
        draft: result.draft,
        categories: result.categories,
      });
      return;
    }

    if (result.status === "pre-capture") {
      setPhase({
        name: "photo",
        shell: {
          name: "pre-error",
          reason: result.reason as PhotoPreCaptureReason,
        },
        autoOpen: false,
      });
      return;
    }

    setPhase({
      name: "photo",
      shell: { name: "extract-fail" },
      autoOpen: false,
    });
  }, []);

  const requestVoiceRecord = useCallback(() => {
    setPhase({ name: "voice", shell: { name: "recording" } });
  }, []);

  const recaptureVoice = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Ready only — no auto-mic (ADR-0008).
    setPhase({ name: "voice", shell: { name: "ready" } });
  }, []);

  const setVoicePreError = useCallback((reason: VoicePreCaptureReason) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({ name: "voice", shell: { name: "pre-error", reason } });
  }, []);

  const cancelVoiceProgress = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase({ name: "idle" });
  }, []);

  const onVoiceRecording = useCallback(async (blob: Blob, mimeType: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({ name: "voice", shell: { name: "progress" } });

    const result = await runVoicePipeline(blob, {
      signal: controller.signal,
      mimeType,
    });

    if (controller.signal.aborted || result.status === "cancelled") {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase({ name: "idle" });
      }
      return;
    }

    abortRef.current = null;

    if (result.status === "ok") {
      setPhase({
        name: "confirm",
        draft: result.draft,
        categories: result.categories,
      });
      return;
    }

    if (result.status === "pre-capture") {
      setPhase({
        name: "voice",
        shell: {
          name: "pre-error",
          reason: result.reason as VoicePreCaptureReason,
        },
      });
      return;
    }

    setPhase({ name: "voice", shell: { name: "extract-fail" } });
  }, []);

  const value = useMemo(
    () => ({
      openManual,
      openPhoto,
      openVoice,
      isCaptureOpen: phase.name !== "idle",
      phase,
      loadError,
      isOpeningConfirm,
      pickManualKind,
      discard,
      onCommitted,
      onPhotoFile,
      cancelPhotoProgress,
      recapturePhoto,
      setPhotoPreError,
      requestVoiceRecord,
      onVoiceRecording,
      cancelVoiceProgress,
      recaptureVoice,
      setVoicePreError,
    }),
    [
      openManual,
      openPhoto,
      openVoice,
      phase,
      loadError,
      isOpeningConfirm,
      pickManualKind,
      discard,
      onCommitted,
      onPhotoFile,
      cancelPhotoProgress,
      recapturePhoto,
      setPhotoPreError,
      requestVoiceRecord,
      onVoiceRecording,
      cancelVoiceProgress,
      recaptureVoice,
      setVoicePreError,
    ],
  );

  return (
    <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
  );
}

/** Full-screen capture UI; parent shell must be `position: relative`. */
export function CaptureLayer() {
  const {
    phase,
    loadError,
    isOpeningConfirm,
    pickManualKind,
    discard,
    onCommitted,
    onPhotoFile,
    cancelPhotoProgress,
    recapturePhoto,
    setPhotoPreError,
    requestVoiceRecord,
    onVoiceRecording,
    cancelVoiceProgress,
    recaptureVoice,
    setVoicePreError,
  } = useCapture();

  if (phase.name === "idle") return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#F3F0FA]">
      {phase.name === "manual-type" ? (
        isOpeningConfirm ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 px-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-[#1A1B2E]/60">
              Загружаем категории…
            </p>
          </div>
        ) : (
          <ManualTypePicker onPick={pickManualKind} onDismiss={discard} />
        )
      ) : null}

      {phase.name === "photo" ? (
        <PhotoShell
          mode={phase.shell}
          autoOpenCapture={phase.autoOpen}
          onFile={onPhotoFile}
          onCancelProgress={cancelPhotoProgress}
          onRecapture={recapturePhoto}
          onDismiss={discard}
          onPermissionDenied={() => {
            setPhotoPreError("permission");
          }}
          onCaptureUnavailable={() => {
            setPhotoPreError("unavailable");
          }}
        />
      ) : null}

      {phase.name === "voice" ? (
        <VoiceShell
          mode={phase.shell}
          onRequestRecord={requestVoiceRecord}
          onRecording={onVoiceRecording}
          onCancelProgress={cancelVoiceProgress}
          onRecapture={recaptureVoice}
          onDismiss={discard}
          onPermissionDenied={() => {
            setVoicePreError("permission");
          }}
          onCaptureUnavailable={() => {
            setVoicePreError("unavailable");
          }}
          onInsecureContext={() => {
            setVoicePreError("insecure");
          }}
        />
      ) : null}

      {phase.name === "confirm" ? (
        <>
          {loadError !== null ? (
            <p
              role="alert"
              className="mx-4 mt-2 rounded-2xl bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
            >
              {loadError}
            </p>
          ) : null}
          <ConfirmDraft
            initialDraft={phase.draft}
            categories={phase.categories}
            onDiscard={discard}
            onCommitted={onCommitted}
          />
        </>
      ) : null}
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { loadPickerCategories } from "@/app/(app)/capture/actions";
import type { CategoryPickerItem } from "@/lib/categories/types";
import { createManualDraft } from "@/lib/draft/create-manual-draft";
import type { Draft, RecordKind } from "@/lib/draft/types";
import { ConfirmDraft } from "./confirm-draft";
import { ManualTypePicker } from "./manual-type-picker";

type CapturePhase =
  | { name: "idle" }
  | { name: "manual-type" }
  | {
      name: "confirm";
      draft: Draft;
      categories: CategoryPickerItem[];
    };

type CaptureContextValue = {
  openManual: () => void;
  isCaptureOpen: boolean;
  phase: CapturePhase;
  loadError: string | null;
  isOpeningConfirm: boolean;
  pickManualKind: (kind: RecordKind) => void;
  discard: () => void;
  onCommitted: () => void;
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
 * Shell-level manual capture state: type pick → confirm → Commit | Discard.
 * Photo/voice pipelines arrive later on the same host.
 */
export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<CapturePhase>({ name: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpeningConfirm, startOpenConfirm] = useTransition();

  const discard = useCallback(() => {
    setLoadError(null);
    setPhase({ name: "idle" });
  }, []);

  const openManual = useCallback(() => {
    setLoadError(null);
    setPhase({ name: "manual-type" });
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

  const value = useMemo(
    () => ({
      openManual,
      isCaptureOpen: phase.name !== "idle",
      phase,
      loadError,
      isOpeningConfirm,
      pickManualKind,
      discard,
      onCommitted,
    }),
    [
      openManual,
      phase,
      loadError,
      isOpeningConfirm,
      pickManualKind,
      discard,
      onCommitted,
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

"use client";

/**
 * SPIKE: telegram-feel-demo — cold-start Mini App session exchange (ADR-0009).
 * Outside Telegram (empty initData): no-op; browser email OTP unchanged.
 */

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  TG_DENY_MINT,
  TG_DENY_NOT_CONFIGURED,
  TG_DENY_STALE,
  TG_DENY_UNMAPPED,
} from "@/lib/telegram/copy";
import { paintTelegramNativeChrome } from "@/lib/telegram/native-chrome";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  themeParams?: Record<string, string | undefined>;
  colorScheme?: "light" | "dark";
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export type TelegramAuthUiState =
  | { kind: "idle" }
  | { kind: "exchanging" }
  | { kind: "ok" }
  | { kind: "denied"; message: string }
  | { kind: "browser" };

function denyMessage(reason: string | undefined): string {
  switch (reason) {
    case "unmapped":
      return TG_DENY_UNMAPPED;
    case "stale":
      return TG_DENY_STALE;
    case "not_configured":
      return TG_DENY_NOT_CONFIGURED;
    case "invalid":
      return TG_DENY_STALE;
    default:
      return TG_DENY_MINT;
  }
}

function applyTheme(webApp: TelegramWebApp) {
  paintTelegramNativeChrome(webApp);
}

function subscribeTelegram() {
  // initData is fixed for the WebView lifetime; no subscription needed.
  return () => {};
}

function getTelegramInitDataSnapshot(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

function getTelegramInitDataServerSnapshot(): string {
  return "";
}

/** True when Mini App provided non-empty initData (client-only). */
export function useTelegramInitData(): string {
  return useSyncExternalStore(
    subscribeTelegram,
    getTelegramInitDataSnapshot,
    getTelegramInitDataServerSnapshot,
  );
}

/**
 * Runs once when Telegram WebApp initData is present.
 * Renders a deny banner when Telegram auth fails.
 */
export function TelegramBootstrap({
  onState,
}: {
  onState?: (state: TelegramAuthUiState) => void;
} = {}) {
  const router = useRouter();
  const initData = useTelegramInitData();
  const started = useRef(false);
  const [phase, setPhase] = useState<"exchanging" | "ok" | "denied">("exchanging");
  const [denyText, setDenyText] = useState<string | null>(null);

  const state: TelegramAuthUiState = useMemo(() => {
    if (!initData) return { kind: "browser" };
    if (phase === "ok") return { kind: "ok" };
    if (phase === "denied") {
      return { kind: "denied", message: denyText ?? TG_DENY_MINT };
    }
    return { kind: "exchanging" };
  }, [initData, phase, denyText]);

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  useEffect(() => {
    if (!initData || started.current) return;
    started.current = true;

    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    // SPIKE: telegram-feel-demo native-ish chrome
    try {
      webApp.ready();
      webApp.expand();
      applyTheme(webApp);
    } catch {
      // ignore
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          status?: string;
          reason?: string;
        };

        if (cancelled) return;

        if (json.status === "ok") {
          setPhase("ok");
          router.replace("/");
          router.refresh();
          return;
        }

        setDenyText(denyMessage(json.reason));
        setPhase("denied");
      } catch {
        if (cancelled) return;
        setDenyText(TG_DENY_MINT);
        setPhase("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initData, router]);

  if (!initData) {
    return null;
  }

  if (phase === "exchanging") {
    return (
      <div
        className="ui-card mb-4 px-4 py-3 text-sm text-ink"
        role="status"
      >
        Вход через Telegram…
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div
        className="mb-4 rounded-card border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-[#C44822]"
        role="alert"
      >
        {denyText ?? TG_DENY_MINT}
      </div>
    );
  }

  return null;
}

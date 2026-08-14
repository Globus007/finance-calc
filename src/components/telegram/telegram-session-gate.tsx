"use client";

/**
 * SPIKE: telegram-feel-demo — wraps login: silent TG auth, hide OTP in WebView.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import { LoginForm } from "@/components/login-form";
import {
  TelegramBootstrap,
  useTelegramInitData,
  type TelegramAuthUiState,
} from "./telegram-bootstrap";

/** false on SSR + first paint; true after client mount (avoids initData hydration mismatch). */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function TelegramSessionGate({
  initialError,
}: {
  initialError?: string | null;
}) {
  const mounted = useHasMounted();
  const initData = useTelegramInitData();
  const [tgState, setTgState] = useState<TelegramAuthUiState | null>(null);

  const onState = useCallback((s: TelegramAuthUiState) => {
    setTgState(s);
  }, []);

  // Match SSR and first client paint before reading Telegram.WebApp.
  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-surface px-5 py-10 text-ink">
        <p className="text-center text-sm text-ink-muted" role="status">
          Загрузка…
        </p>
      </div>
    );
  }

  // No Telegram initData → browser email OTP (ADR-0009).
  if (!initData) {
    return <LoginForm initialError={initialError} />;
  }

  // Telegram WebView: silent session exchange; never show email OTP.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-surface px-5 py-10 text-ink">
      <TelegramBootstrap onState={onState} />
      {tgState?.kind === "exchanging" || tgState === null ? (
        <p className="text-center text-sm text-ink-muted" role="status">
          Вход через Telegram…
        </p>
      ) : null}
    </div>
  );
}

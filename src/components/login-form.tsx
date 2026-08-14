"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestLoginOtp, verifyLoginOtp } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";
import { messageForLoginQueryError } from "@/lib/auth/login-query-error";
import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";

const SENT_INFO =
  "Если этот email зарегистрирован, мы отправили код. Введите 6 цифр из письма — так вход работает и в установленном PWA.";

/**
 * Primary auth: 6-digit email OTP entered inside the app (PWA-safe).
 * Magic link → /auth/confirm remains a secondary path (same cookie session).
 */
export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    messageForLoginQueryError(initialError),
  );
  const [info, setInfo] = useState<string | null>(null);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  async function signInWithProvider(provider: "google" | "github" | "discord") {
    setError(null);
    setInfo(null);
    setOauthProvider(provider);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setOauthProvider(null);
      setError("Не удалось начать вход через провайдера. Попробуйте ещё раз.");
    }
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Введите корректный email.");
      return;
    }

    startTransition(async () => {
      const result = await requestLoginOtp(trimmed);

      if (result.status === "invalid_email") {
        setError("Введите корректный email.");
        return;
      }
      if (result.status === "rate_limited") {
        setError(
          "Supabase временно блокирует отправку (cooldown ~60 с или лимит бесплатной почты ~2 письма/час). Подождите до часа, проверьте «Спам», не жмите кнопку повторно. Для снятия лимита — Custom SMTP в Dashboard.",
        );
        return;
      }
      if (result.status === "unavailable") {
        setError("Не удалось выполнить вход. Попробуйте ещё раз.");
        return;
      }

      setEmail(trimmed);
      setCode("");
      setStep("code");
      setInfo(SENT_INFO);
    });
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const normalized = normalizeOtpCode(code);
    if (!isValidOtpCode(normalized)) {
      setError("Введите 6-значный код из письма.");
      return;
    }

    startTransition(async () => {
      const result = await verifyLoginOtp(email, normalized);

      if (result.status === "invalid_email") {
        setError("Введите корректный email.");
        setStep("email");
        return;
      }
      if (result.status === "invalid_code") {
        setError("Неверный или просроченный код. Запросите новый.");
        return;
      }
      if (result.status === "rate_limited") {
        setError(
          "Слишком много попыток. Подождите около минуты и попробуйте снова.",
        );
        return;
      }
      if (result.status === "unavailable") {
        setError("Не удалось выполнить вход. Попробуйте ещё раз.");
        return;
      }

      // status === "ok" — cookies set on server; land on protected shell.
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="app-frame relative mx-auto h-dvh max-h-dvh w-full max-w-lg overflow-y-auto overscroll-y-contain bg-surface text-ink md:my-5 md:h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-2.5rem)]">
      <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[#C7D2FE]/55 blur-3xl" />

      {/* min-h-full + justify-center lives here so a tall form scrolls from the top. */}
      <div className="relative flex min-h-full flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="ui-card relative p-6">
          <LoginHeader />

          {step === "email" ? (
            <>
              <div className="mt-7 space-y-2.5">
                <OAuthButton
                  label="Google"
                  provider="google"
                  pendingProvider={oauthProvider}
                  disabled={isPending}
                  onClick={signInWithProvider}
                />
                <OAuthButton
                  label="GitHub"
                  provider="github"
                  pendingProvider={oauthProvider}
                  disabled={isPending}
                  onClick={signInWithProvider}
                />
                <OAuthButton
                  label="Discord"
                  provider="discord"
                  pendingProvider={oauthProvider}
                  disabled={isPending}
                  onClick={signInWithProvider}
                />
              </div>
              <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                <span className="h-px flex-1 bg-line" />
                <span>или по email</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <form onSubmit={sendCode} className="space-y-4">
                <label className="block">
                  <span className="ui-kicker">Email</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className="ui-field mt-2 text-base placeholder:text-ink-muted"
                    placeholder="you@example.com"
                    disabled={isPending}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isPending}
                  className="ui-btn-primary w-full"
                >
                  {isPending ? "Отправляем…" : "Получить код"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={submitCode} className="mt-7 space-y-4">
              <p className="rounded-control bg-brand-soft px-3.5 py-3 text-sm leading-relaxed text-brand">
                Код отправлен на{" "}
                <span className="font-bold text-brand-deep">{email}</span>.
                Введите его <strong>здесь</strong> — так сессия останется в этом
                приложении, в том числе на домашнем экране.
              </p>
              <label className="block">
                <span className="ui-kicker">Код из письма</span>
                <input
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  pattern="[0-9 ]*"
                  maxLength={8}
                  required
                  value={code}
                  onChange={(ev) => setCode(ev.target.value)}
                  className="ui-field mt-2 text-center font-mono text-2xl tracking-[0.35em] placeholder:text-brand-soft"
                  placeholder="••••••"
                  disabled={isPending}
                  aria-label="6-значный код"
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="ui-btn-primary w-full"
              >
                {isPending ? "Проверяем…" : "Войти"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setInfo(null);
                }}
                className="w-full rounded-control py-1 text-sm font-bold text-brand transition hover:bg-brand-soft disabled:opacity-60"
              >
                Изменить email / отправить снова
              </button>
            </form>
          )}

          {info ? (
            <p className="mt-4 rounded-control bg-positive-soft px-3.5 py-3 text-sm leading-relaxed text-positive" role="status">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-control bg-expense-soft px-3.5 py-3 text-sm leading-relaxed text-[#C44822]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Static header — hoisted as a module-level component (rendering-hoist-jsx). */
function OAuthButton({
  label,
  provider,
  pendingProvider,
  disabled,
  onClick,
}: {
  label: string;
  provider: "google" | "github" | "discord";
  pendingProvider: string | null;
  disabled: boolean;
  onClick: (provider: "google" | "github" | "discord") => void;
}) {
  const isPending = pendingProvider === provider;
  return (
    <button
      type="button"
      disabled={disabled || pendingProvider !== null}
      onClick={() => onClick(provider)}
      className="flex w-full cursor-pointer items-center justify-center rounded-control border border-line bg-surface-strong px-4 py-3.5 text-sm font-bold text-ink transition hover:border-brand-soft hover:bg-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Перенаправляем…" : `Войти через ${label}`}
    </button>
  );
}

function LoginHeader() {
  return (
    <>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-control text-sm font-bold text-white shadow-[0_10px_20px_-12px_rgba(79,70,229,0.58)]"
        style={{ background: "var(--brand-fill)" }}
      >
        Br
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
        Личные финансы
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-ink">Вход</h1>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
        Вход по коду из письма. Код вводится в приложении — удобно для PWA на
        домашнем экране.
      </p>
    </>
  );
}

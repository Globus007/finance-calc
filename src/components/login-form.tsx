"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  requestLoginOtp,
  verifyLoginOtp,
} from "@/app/login/actions";
import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";

type Step = "email" | "otp";

const AUTH_LINK_ERROR =
  "Не удалось войти по ссылке. Введите код из письма.";

const SENT_INFO =
  "Если этот email зарегистрирован, мы отправили код. Введите 6 цифр.";

/**
 * Primary auth: email OTP entered in-app (PWA-safe).
 * Magic-link ?code= is not the primary flow.
 * OTP request goes through a server action so clients never see
 * account-absence errors (anti-enumeration).
 */
export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "auth" ? AUTH_LINK_ERROR : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  function sendOtp(e: React.FormEvent) {
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
        setError("Слишком много попыток. Подождите минуту и попробуйте снова.");
        return;
      }
      if (result.status === "unavailable") {
        setError("Не удалось выполнить вход. Попробуйте ещё раз.");
        return;
      }

      // status === "sent" — same for existing and missing accounts
      setEmail(trimmed);
      setStep("otp");
      setInfo(SENT_INFO);
    });
  }

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const code = normalizeOtpCode(otp);
    if (!isValidOtpCode(code)) {
      setError("Код должен содержать 6 цифр.");
      return;
    }

    startTransition(async () => {
      const result = await verifyLoginOtp(email, code);

      if (result.status === "ok") {
        router.replace("/");
        router.refresh();
        return;
      }
      if (result.status === "rate_limited") {
        setError("Слишком много попыток. Подождите минуту и попробуйте снова.");
        return;
      }
      if (result.status === "invalid_code") {
        setError("Код неверный или истёк. Запросите новый.");
        return;
      }
      setError("Не удалось выполнить вход. Попробуйте ещё раз.");
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-[#F3F0FA] px-5 py-10 text-[#1A1B2E]">
      <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]">
        <LoginHeader />

        {step === "email" ? (
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-[#1A1B2E]/55">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#1A1B2E]/10 bg-[#F8F7FC] px-4 py-3 text-base outline-none ring-[#5B6CFF]/40 focus:ring-2"
                placeholder="you@example.com"
                disabled={isPending}
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5B6CFF]/30 transition active:scale-[0.99] disabled:opacity-60"
            >
              {isPending ? "Отправляем…" : "Получить код"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <p className="text-sm text-[#1A1B2E]/55">
              Код для{" "}
              <span className="font-semibold text-[#1A1B2E]">{email}</span>
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-[#1A1B2E]/55">
                Код из письма
              </span>
              <input
                type="text"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={8}
                required
                value={otp}
                onChange={(ev) => setOtp(ev.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#1A1B2E]/10 bg-[#F8F7FC] px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] outline-none ring-[#5B6CFF]/40 focus:ring-2"
                placeholder="••••••"
                disabled={isPending}
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5B6CFF]/30 transition active:scale-[0.99] disabled:opacity-60"
            >
              {isPending ? "Проверяем…" : "Войти"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
                setInfo(null);
              }}
              className="w-full text-sm font-semibold text-[#5B6CFF]"
            >
              Изменить email
            </button>
          </form>
        )}

        {info ? (
          <p className="mt-4 text-sm text-[#059669]" role="status">
            {info}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[#DC2626]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Static header — hoisted as a module-level component (rendering-hoist-jsx). */
function LoginHeader() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B6CFF]">
        Finance
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Вход</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#1A1B2E]/55">
        Вход по коду из письма. Так сессия остаётся в установленном PWA, без
        перехода по magic-link.
      </p>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "otp";

/**
 * Primary auth: email OTP entered in-app (PWA-safe).
 * Magic-link ?code= is not the primary flow.
 */
export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "Не удалось войти по ссылке. Введите код из письма."
      : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Введите корректный email.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // Single-user MVP: account is pre-provisioned (Dashboard).
          // Seed Categories still run on auth.users insert from schema ticket.
          shouldCreateUser: false,
        },
      });

      if (sendError) {
        setError(mapAuthError(sendError.message));
        return;
      }

      setEmail(trimmed);
      setStep("otp");
      setInfo("Код отправлен на почту. Введите 6 цифр.");
    } catch {
      setError("Сеть недоступна. Проверьте подключение и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const code = normalizeOtpCode(otp);
    if (!isValidOtpCode(code)) {
      setError("Код должен содержать 6 цифр.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (verifyError) {
        setError(mapAuthError(verifyError.message));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Проверьте подключение и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-[#F3F0FA] px-5 py-10 text-[#1A1B2E]">
      <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B6CFF]">
          Finance
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Вход</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#1A1B2E]/55">
          Вход по коду из письма. Так сессия остаётся в установленном PWA, без
          перехода по magic-link.
        </p>

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
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5B6CFF]/30 transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Отправляем…" : "Получить код"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <p className="text-sm text-[#1A1B2E]/55">
              Код для <span className="font-semibold text-[#1A1B2E]">{email}</span>
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
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5B6CFF]/30 transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Проверяем…" : "Войти"}
            </button>
            <button
              type="button"
              disabled={busy}
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

        {info && (
          <p className="mt-4 text-sm text-[#059669]" role="status">
            {info}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-[#DC2626]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("signups not allowed") || lower.includes("user not found")) {
    return "Этот email не зарегистрирован. Обратитесь к владельцу приложения.";
  }
  if (lower.includes("rate") || lower.includes("security purposes")) {
    return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  }
  if (lower.includes("expired") || lower.includes("otp")) {
    return "Код неверный или истёк. Запросите новый.";
  }
  if (lower.includes("invalid")) {
    return "Код неверный или истёк. Запросите новый.";
  }
  return "Не удалось выполнить вход. Попробуйте ещё раз.";
}

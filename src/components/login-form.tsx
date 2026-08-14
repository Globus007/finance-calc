"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestLoginOtp, verifyLoginOtp } from "@/app/login/actions";
import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";

const AUTH_LINK_ERROR =
  "Не удалось войти по ссылке. Запросите новый код и введите его здесь, в приложении.";

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
    initialError === "auth" ? AUTH_LINK_ERROR : null,
  );
  const [info, setInfo] = useState<string | null>(null);

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
    <div className="relative mx-auto h-dvh max-h-dvh w-full max-w-lg overflow-y-auto overscroll-y-contain bg-[#F5F7FC] text-[#172033] md:my-5 md:h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-2.5rem)] md:rounded-[2rem] md:border md:border-white/80 md:shadow-[0_28px_80px_-32px_rgba(49,46,129,0.38)]">
      <div className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[#C7D2FE]/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-[#CCFBF1]/50 blur-3xl" />

      {/* min-h-full + justify-center lives here so a tall form scrolls from the top. */}
      <div className="relative flex min-h-full flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="relative rounded-[2rem] border border-white/85 bg-white/86 p-6 shadow-[0_24px_54px_-30px_rgba(23,32,51,0.42)] backdrop-blur-xl">
          <LoginHeader />

          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-7 space-y-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#697386]">
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
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF2] bg-[#F8FAFC] px-4 py-3.5 text-base text-[#172033] outline-none transition placeholder:text-[#9AA4B2] focus:border-[#818CF8] focus:bg-white focus:ring-4 focus:ring-[#E9EAFE]"
                  placeholder="you@example.com"
                  disabled={isPending}
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#3730A3] px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_24px_-12px_rgba(79,70,229,0.60)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Отправляем…" : "Получить код"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="mt-7 space-y-4">
              <p className="rounded-2xl bg-[#EEF2FF] px-3.5 py-3 text-sm leading-relaxed text-[#4F46E5]">
                Код отправлен на{" "}
                <span className="font-bold text-[#312E81]">{email}</span>.
                Введите его <strong>здесь</strong> — так сессия останется в этом
                приложении, в том числе на домашнем экране.
              </p>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#697386]">
                  Код из письма
                </span>
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
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF2] bg-[#F8FAFC] px-4 py-3.5 text-center font-mono text-2xl tracking-[0.35em] text-[#172033] outline-none transition placeholder:text-[#A5B4FC] focus:border-[#818CF8] focus:bg-white focus:ring-4 focus:ring-[#E9EAFE]"
                  placeholder="••••••"
                  disabled={isPending}
                  aria-label="6-значный код"
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#3730A3] px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_24px_-12px_rgba(79,70,229,0.60)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full rounded-xl py-1 text-sm font-bold text-[#4F46E5] transition hover:bg-[#EEF2FF] disabled:opacity-60"
              >
                Изменить email / отправить снова
              </button>
            </form>
          )}

          {info ? (
            <p className="mt-4 rounded-2xl bg-[#DFF8EF] px-3.5 py-3 text-sm leading-relaxed text-[#087E66]" role="status">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl bg-[#FFF0E9] px-3.5 py-3 text-sm leading-relaxed text-[#C44822]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Static header — hoisted as a module-level component (rendering-hoist-jsx). */
function LoginHeader() {
  return (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#3730A3] text-sm font-bold text-white shadow-[0_12px_22px_-12px_rgba(79,70,229,0.65)]">
        Br
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F46E5]">
        Личные финансы
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-[#172033]">Вход</h1>
      <p className="mt-2.5 text-sm leading-relaxed text-[#697386]">
        Вход по коду из письма. Код вводится в приложении — удобно для PWA на
        домашнем экране.
      </p>
    </>
  );
}

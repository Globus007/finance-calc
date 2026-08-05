"use client";

import { useState, useTransition } from "react";
import { requestLoginOtp } from "@/app/login/actions";
import { isValidEmail } from "@/lib/auth/otp";

const AUTH_LINK_ERROR =
  "Не удалось войти по ссылке. Запросите новое письмо и откройте ссылку в том же браузере, где нажимали «Получить ссылку».";

const SENT_INFO =
  "Если этот email зарегистрирован, мы отправили ссылку. Откройте письмо и нажмите Sign in — вы попадёте в приложение уже авторизованным.";

/**
 * Primary auth: email magic link (default Supabase template).
 * Session is established on /auth/confirm after the user opens the email link.
 */
export function LoginForm({ initialError }: { initialError?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "auth" ? AUTH_LINK_ERROR : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  function sendLink(e: React.FormEvent) {
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

      // status === "sent" — same for existing and missing accounts
      setEmail(trimmed);
      setStep("sent");
      setInfo(SENT_INFO);
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-[#F3F0FA] px-5 py-10 text-[#1A1B2E]">
      <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]">
        <LoginHeader />

        {step === "email" ? (
          <form onSubmit={sendLink} className="mt-6 space-y-4">
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
              {isPending ? "Отправляем…" : "Получить ссылку"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-relaxed text-[#1A1B2E]/70">
              Письмо отправлено на{" "}
              <span className="font-semibold text-[#1A1B2E]">{email}</span>.
              Откройте ссылку <strong>в этом же браузере</strong> (не в другом
              приложении / инкогнито), иначе сессия не установится.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setStep("email");
                setError(null);
                setInfo(null);
              }}
              className="w-full text-sm font-semibold text-[#5B6CFF]"
            >
              Изменить email / отправить снова
            </button>
          </div>
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
        Вход по ссылке из письма. После перехода вы сразу попадёте в приложение.
      </p>
    </>
  );
}

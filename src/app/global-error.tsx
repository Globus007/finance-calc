"use client";

import { useEffect } from "react";
import { Honeybadger } from "@honeybadger-io/react";

/**
 * Global App Router error UI (replaces root layout when it fails).
 * Must render its own <html> / <body>.
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Honeybadger.notify(error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-full font-sans antialiased">
        <div className="px-4 pb-6 pt-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">
            Что-то пошло не так
          </h1>
          <p className="mt-2 text-sm text-[#1A1B2E]/55">
            Произошла ошибка. Попробуйте ещё раз.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-[#5B6CFF] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#5B6CFF]/30 transition active:scale-95"
          >
            Повторить
          </button>
        </div>
      </body>
    </html>
  );
}

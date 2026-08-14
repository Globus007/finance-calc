"use client";

import { useEffect } from "react";
import { Honeybadger } from "@honeybadger-io/react";

/**
 * Segment error UI for authenticated app surfaces (Home, Month, History, …).
 * Load failures (e.g. Supabase query errors) throw from loaders so we never
 * render zero totals / empty History as if the month were genuinely empty.
 * Also reports to Honeybadger.
 */
export default function AppError({
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
    <div className="px-4 pb-6 pt-10 text-center">
      <h1 className="text-xl font-bold tracking-tight">Не удалось загрузить</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Данные временно недоступны. Попробуйте ещё раз.
      </p>
      <button
        type="button"
        onClick={reset}
        className="ui-btn-primary mt-6 w-auto px-5 py-2.5"
      >
        Повторить
      </button>
    </div>
  );
}

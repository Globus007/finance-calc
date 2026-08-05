"use client";

/**
 * Segment error UI for authenticated app surfaces (Home, Month, History, …).
 * Load failures (e.g. Supabase query errors) throw from loaders so we never
 * render zero totals / empty History as if the month were genuinely empty.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 pb-6 pt-10 text-center">
      <h1 className="text-xl font-bold tracking-tight">Не удалось загрузить</h1>
      <p className="mt-2 text-sm text-[#1A1B2E]/55">
        Данные временно недоступны. Попробуйте ещё раз.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-[#5B6CFF] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#5B6CFF]/30 transition active:scale-95"
      >
        Повторить
      </button>
    </div>
  );
}

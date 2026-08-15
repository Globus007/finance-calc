"use client";

import { SegmentErrorFallback } from "@/components/segment-error-fallback";

/**
 * Segment error UI for authenticated app surfaces (Home, Month, History, …).
 * Load failures (e.g. Supabase query errors) throw from loaders so we never
 * render zero totals / empty History as if the month were genuinely empty.
 * Real server exceptions are reported from instrumentation.onRequestError;
 * React #441 digest wrappers are not sent to Honeybadger.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentErrorFallback
      title="Не удалось загрузить"
      description="Данные временно недоступны. Попробуйте ещё раз."
      error={error}
      reset={reset}
    />
  );
}

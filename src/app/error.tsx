"use client";

import { SegmentErrorFallback } from "@/components/segment-error-fallback";

/**
 * Root App Router error UI.
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentErrorFallback
      title="Что-то пошло не так"
      description="Произошла ошибка. Попробуйте ещё раз."
      error={error}
      reset={reset}
    />
  );
}

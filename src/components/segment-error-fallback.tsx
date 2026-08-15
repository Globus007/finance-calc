"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Honeybadger } from "@honeybadger-io/react";
import { isServerComponentDigestNotice } from "@/lib/honeybadger/is-server-component-digest-notice";

/**
 * Segment / root error UI. Retry refetches RSC payload (`router.refresh`)
 * before resetting the boundary — `reset()` alone rethrows the cached digest
 * (Honeybadger 133287303: «Повторить» with no new GET).
 */
export function SegmentErrorFallback({
  title,
  description,
  error,
  reset,
}: {
  title: string;
  description: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [, startRetry] = useTransition();

  useEffect(() => {
    if (isServerComponentDigestNotice(error)) return;
    Honeybadger.notify(error);
  }, [error]);

  return (
    <div className="px-4 pb-6 pt-10 text-center">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      <button
        type="button"
        onClick={() => {
          startRetry(() => {
            router.refresh();
            reset();
          });
        }}
        className="ui-btn-primary mt-6 w-auto px-5 py-2.5"
      >
        Повторить
      </button>
    </div>
  );
}

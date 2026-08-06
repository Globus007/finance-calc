"use client";

import { Honeybadger, HoneybadgerErrorBoundary } from "@honeybadger-io/react";
import { honeybadgerConfig } from "@/lib/honeybadger/config";

Honeybadger.configure(honeybadgerConfig);

/**
 * Client-side Honeybadger Error Boundary for React component errors.
 */
export function HoneybadgerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
      {children}
    </HoneybadgerErrorBoundary>
  );
}

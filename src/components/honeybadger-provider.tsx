"use client";

import { Honeybadger, HoneybadgerErrorBoundary } from "@honeybadger-io/react";
import { honeybadgerConfig } from "@/lib/honeybadger/config";
import { isBrowserExtensionNotice } from "@/lib/honeybadger/is-browser-extension-notice";
import { isServerComponentDigestNotice } from "@/lib/honeybadger/is-server-component-digest-notice";

Honeybadger.configure(honeybadgerConfig);
Honeybadger.beforeNotify((notice) => {
  if (isBrowserExtensionNotice(notice)) return false;
  if (isServerComponentDigestNotice(notice)) return false;
});

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

/**
 * Pre-capture environment checks (HTTPS / network).
 * Failures surface as pre-capture UX — never silent, never offline queue (ADR-0008).
 */

/** Camera/mic (getUserMedia) require a secure context: HTTPS or localhost. */
export function isCaptureSecureContext(
  isSecure: boolean | undefined = typeof window !== "undefined"
    ? window.isSecureContext
    : undefined,
): boolean {
  return isSecure === true;
}

/** Online-first: offline before upload is pre-capture, not Extraction failure. */
export function isCaptureOnline(
  online: boolean | undefined = typeof navigator !== "undefined"
    ? navigator.onLine
    : undefined,
): boolean {
  return online !== false;
}

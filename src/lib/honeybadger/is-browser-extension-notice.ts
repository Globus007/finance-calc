/**
 * Browser extensions inject scripts into the page. Their unhandled
 * rejections are captured by Honeybadger's window.onunhandledrejection
 * hook and look like first-party faults.
 *
 * Honeybadger fault 133494264: Urban VPN
 * (`chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon`) threw
 * `Cannot read properties of undefined (reading 'M_ID')`.
 */
const BROWSER_EXTENSION_URL =
  /(?:chrome|moz|safari|safari-web)-extension:\/\//i;

export type HoneybadgerNoticeLike = {
  message?: string;
  stack?: string;
  backtrace?: ReadonlyArray<{ file?: string | null } | null> | null;
};

export function isBrowserExtensionNotice(
  notice?: HoneybadgerNoticeLike | null,
): boolean {
  if (!notice) return false;

  if (
    notice.backtrace?.some(
      (frame) => frame?.file != null && BROWSER_EXTENSION_URL.test(frame.file),
    )
  ) {
    return true;
  }

  return notice.stack != null && BROWSER_EXTENSION_URL.test(notice.stack);
}

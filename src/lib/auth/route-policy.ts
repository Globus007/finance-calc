/**
 * Auth routing policy for the MVP shell.
 * Public: OTP login + optional magic-link confirm.
 * Everything else requires a cookie session (enforced in proxy).
 */

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true;
  }
  // Secondary magic-link confirm only (research #11); keep surface narrow.
  if (pathname === "/auth/confirm") {
    return true;
  }
  return false;
}

export function resolveAuthRedirect(input: {
  pathname: string;
  hasUser: boolean;
}): string | null {
  const { pathname, hasUser } = input;

  if (!hasUser && !isAuthPublicPath(pathname)) {
    return "/login";
  }

  if (hasUser && (pathname === "/login" || pathname.startsWith("/login/"))) {
    return "/";
  }

  return null;
}

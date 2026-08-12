/**
 * Auth routing policy for the MVP shell.
 * Public: login (in-app OTP) + secondary magic-link confirm (PKCE / token_hash)
 * + Telegram bot webhook (and residual Mini App auth) APIs without cookie session.
 * Everything else requires a cookie session (enforced in proxy).
 */

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true;
  }
  // Auth callback — exchanges the PKCE code before session cookies exist.
  if (pathname === "/auth/callback") {
    return true;
  }
  // Magic-link landing — must stay public before session cookies exist.
  if (pathname === "/auth/confirm") {
    return true;
  }
  // Telegram bot webhook + optional Mini App session exchange (no cookie yet).
  if (pathname === "/api/telegram" || pathname.startsWith("/api/telegram/")) {
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

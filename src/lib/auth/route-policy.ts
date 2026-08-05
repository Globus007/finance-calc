/**
 * Auth routing policy for the MVP shell.
 * Public: login (in-app OTP) + secondary magic-link confirm (PKCE / token_hash).
 * Everything else requires a cookie session (enforced in proxy).
 */

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true;
  }
  // Magic-link landing — must stay public before session cookies exist.
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

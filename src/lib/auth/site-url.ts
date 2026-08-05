import { headers } from "next/headers";

/**
 * Public origin for magic-link emailRedirectTo.
 * Prefer NEXT_PUBLIC_SITE_URL; fall back to request Host headers.
 */
export async function getPublicOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return "http://localhost:3000";
  }

  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}

/** Absolute URL Supabase redirects to after the user clicks the email link. */
export async function getMagicLinkRedirectTo(): Promise<string> {
  const origin = await getPublicOrigin();
  return `${origin}/auth/confirm`;
}

/**
 * Allowlisted in-app destination after successful auth.
 * Only relative app paths — no open redirects.
 */
export function resolvePostAuthPath(nextRaw: string | null): string {
  if (nextRaw === "/month") {
    return "/month";
  }
  return "/";
}

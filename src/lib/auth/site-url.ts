import { headers } from "next/headers";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** True for localhost / loopback hosts (with or without port / scheme). */
export function isLocalHost(hostOrUrl: string): boolean {
  try {
    const hostname = hostOrUrl.includes("://")
      ? new URL(hostOrUrl).hostname
      : (hostOrUrl.split(":")[0] ?? hostOrUrl);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function originFromHost(host: string, protoHint?: string | null): string {
  const proto = protoHint ?? (isLocalHost(host) ? "http" : "https");
  return stripTrailingSlash(`${proto}://${host}`);
}

export type PublicOriginInput = {
  /** NEXT_PUBLIC_SITE_URL */
  configured?: string | null;
  /** x-forwarded-host or host */
  host?: string | null;
  /** x-forwarded-proto */
  proto?: string | null;
  /** VERCEL_ENV */
  vercelEnv?: string | null;
  /** VERCEL_PROJECT_PRODUCTION_URL */
  vercelProductionUrl?: string | null;
  /** VERCEL_URL (deployment host, no scheme) */
  vercelUrl?: string | null;
};

/**
 * Pure origin resolution for magic-link emailRedirectTo.
 *
 * Order (production-safe):
 * 1. Non-local request Host — correct on Vercel prod/preview
 * 2. Non-local NEXT_PUBLIC_SITE_URL — explicit production config
 * 3. Vercel production alias (when VERCEL_ENV=production)
 * 4. Vercel deployment URL (VERCEL_URL)
 * 5. Local configured URL or localhost request host
 * 6. http://localhost:3000
 *
 * Never prefer a localhost NEXT_PUBLIC_SITE_URL when the request (or Vercel env)
 * targets a deployed host — common magic-link prod footgun.
 */
export function resolvePublicOrigin(input: PublicOriginInput): string {
  const configured = input.configured?.trim()
    ? stripTrailingSlash(input.configured.trim())
    : "";
  const host = input.host?.trim() || null;
  const proto = input.proto;

  if (host && !isLocalHost(host)) {
    return originFromHost(host, proto);
  }

  if (configured && !isLocalHost(configured)) {
    return configured;
  }

  const vercelProduction = input.vercelProductionUrl?.trim();
  if (
    input.vercelEnv === "production" &&
    vercelProduction &&
    !isLocalHost(vercelProduction)
  ) {
    return originFromHost(
      vercelProduction.replace(/^https?:\/\//, ""),
      "https",
    );
  }

  const vercelUrl = input.vercelUrl?.trim();
  if (vercelUrl && !isLocalHost(vercelUrl)) {
    return originFromHost(vercelUrl.replace(/^https?:\/\//, ""), "https");
  }

  if (configured) {
    return configured;
  }

  if (host) {
    return originFromHost(host, proto);
  }

  return "http://localhost:3000";
}

/**
 * Public origin for magic-link emailRedirectTo (async: reads request headers).
 */
export async function getPublicOrigin(): Promise<string> {
  const h = await headers();
  return resolvePublicOrigin({
    configured: process.env.NEXT_PUBLIC_SITE_URL,
    host: h.get("x-forwarded-host") ?? h.get("host"),
    proto: h.get("x-forwarded-proto"),
    vercelEnv: process.env.VERCEL_ENV,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
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

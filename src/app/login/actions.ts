"use server";

import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";
import {
  toRequestOtpResult,
  type RequestOtpResult,
} from "@/lib/auth/request-otp-result";
import { getMagicLinkRedirectTo } from "@/lib/auth/site-url";
import {
  toVerifyOtpResult,
  type VerifyOtpResult,
} from "@/lib/auth/verify-otp-result";
import { createClient } from "@/lib/supabase/server";

/**
 * Request email OTP (and secondary magic link via Supabase template).
 * Always returns the same `sent` shape for existing and missing accounts so
 * clients cannot enumerate registered emails.
 *
 * Primary completion for installed PWA: enter 6-digit code in-app
 * (`verifyLoginOtp`) so the session is created in the same cookie jar as the
 * standalone WebView — not via Safari-opened magic-link `?code=` (issue #11/#30).
 * Secondary: open link → /auth/confirm (PKCE or token_hash).
 */
export async function requestLoginOtp(email: string): Promise<RequestOtpResult> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    return { status: "invalid_email" };
  }

  try {
    const supabase = await createClient();
    const emailRedirectTo = await getMagicLinkRedirectTo();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // Single-user MVP: account is pre-provisioned (Dashboard).
        shouldCreateUser: false,
        emailRedirectTo,
      },
    });

    if (error && process.env.NODE_ENV === "development") {
      // Surface provider text in the server terminal (not the browser).
      console.warn("[requestLoginOtp]", error.message, { emailRedirectTo });
    }

    return toRequestOtpResult(error?.message ?? null);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[requestLoginOtp] exception", err);
    }
    return { status: "unavailable" };
  }
}

/**
 * Complete sign-in with the 6-digit email OTP inside the PWA/browser context.
 * Sets session cookies via @supabase/ssr on success.
 */
export async function verifyLoginOtp(
  email: string,
  token: string,
): Promise<VerifyOtpResult> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    return { status: "invalid_email" };
  }
  const code = normalizeOtpCode(token);
  if (!isValidOtpCode(code)) {
    return { status: "invalid_code" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: trimmed,
      token: code,
      type: "email",
    });

    if (error && process.env.NODE_ENV === "development") {
      console.warn("[verifyLoginOtp]", error.message);
    }

    return toVerifyOtpResult(error?.message ?? null);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[verifyLoginOtp] exception", err);
    }
    return { status: "unavailable" };
  }
}

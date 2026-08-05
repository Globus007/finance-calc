"use server";

import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "@/lib/auth/otp";
import {
  toRequestOtpResult,
  type RequestOtpResult,
} from "@/lib/auth/request-otp-result";
import { createClient } from "@/lib/supabase/server";

export type VerifyOtpResult =
  | { status: "ok" }
  | { status: "invalid_code" }
  | { status: "rate_limited" }
  | { status: "unavailable" };

/**
 * Request email OTP. Always returns the same `sent` shape for existing and
 * missing accounts so clients cannot enumerate registered emails.
 * (server-auth-actions: public mutation — validate inputs inside the action.)
 */
export async function requestLoginOtp(email: string): Promise<RequestOtpResult> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    return { status: "invalid_email" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // Single-user MVP: account is pre-provisioned (Dashboard).
        shouldCreateUser: false,
      },
    });

    return toRequestOtpResult(error?.message ?? null);
  } catch {
    return { status: "unavailable" };
  }
}

/** Verify 6-digit OTP and establish cookie session via @supabase/ssr. */
export async function verifyLoginOtp(
  email: string,
  token: string,
): Promise<VerifyOtpResult> {
  const trimmed = email.trim().toLowerCase();
  const code = normalizeOtpCode(token);

  if (!isValidEmail(trimmed) || !isValidOtpCode(code)) {
    return { status: "invalid_code" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: trimmed,
      token: code,
      type: "email",
    });

    if (!error) {
      return { status: "ok" };
    }

    const lower = error.message.toLowerCase();
    if (
      lower.includes("rate") ||
      lower.includes("security purposes") ||
      lower.includes("too many")
    ) {
      return { status: "rate_limited" };
    }
    if (
      lower.includes("expired") ||
      lower.includes("otp") ||
      lower.includes("invalid") ||
      lower.includes("token")
    ) {
      return { status: "invalid_code" };
    }
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

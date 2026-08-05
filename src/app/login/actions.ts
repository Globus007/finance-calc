"use server";

import { isValidEmail } from "@/lib/auth/otp";
import {
  toRequestOtpResult,
  type RequestOtpResult,
} from "@/lib/auth/request-otp-result";
import { getMagicLinkRedirectTo } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Request magic-link email. Always returns the same `sent` shape for existing
 * and missing accounts so clients cannot enumerate registered emails.
 * (server-auth-actions: public mutation — validate inputs inside the action.)
 *
 * Primary completion path: user opens the link → /auth/confirm (PKCE code
 * exchange or token_hash verify) → cookie session.
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

import { isRateLimitError } from "./request-otp-result";

/**
 * Maps Supabase verifyOtp outcomes to a client-safe result.
 * Does not leak whether the email is registered.
 */

export type VerifyOtpResult =
  | { status: "ok" }
  | { status: "invalid_code" }
  | { status: "invalid_email" }
  | { status: "rate_limited" }
  | { status: "unavailable" };

export function isInvalidOtpError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("otp") ||
    lower.includes("token") ||
    lower.includes("invalid") ||
    lower.includes("expired") ||
    lower.includes("email not confirmed")
  );
}

/** Pure seam: convert provider verify error (or none) into unified client result. */
export function toVerifyOtpResult(
  verifyErrorMessage: string | null | undefined,
): VerifyOtpResult {
  if (!verifyErrorMessage) {
    return { status: "ok" };
  }
  if (isRateLimitError(verifyErrorMessage)) {
    return { status: "rate_limited" };
  }
  if (isInvalidOtpError(verifyErrorMessage)) {
    return { status: "invalid_code" };
  }
  return { status: "unavailable" };
}

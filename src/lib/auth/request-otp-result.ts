/**
 * Maps Supabase signInWithOtp outcomes to a client-safe result.
 * Account-absence errors are collapsed into `sent` so the UI cannot
 * enumerate whether an email is registered (single-user MVP).
 */

export type RequestOtpResult =
  | { status: "sent" }
  | { status: "invalid_email" }
  | { status: "rate_limited" }
  | { status: "unavailable" };

export function isAccountAbsenceError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("signups not allowed") ||
    lower.includes("signup is disabled") ||
    lower.includes("user not found") ||
    lower.includes("user_not_found")
  );
}

export function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate") ||
    lower.includes("security purposes") ||
    lower.includes("too many")
  );
}

/** Pure seam: convert provider error (or none) into unified client result. */
export function toRequestOtpResult(
  sendErrorMessage: string | null | undefined,
): RequestOtpResult {
  if (!sendErrorMessage) {
    return { status: "sent" };
  }
  if (isAccountAbsenceError(sendErrorMessage)) {
    return { status: "sent" };
  }
  if (isRateLimitError(sendErrorMessage)) {
    return { status: "rate_limited" };
  }
  return { status: "unavailable" };
}

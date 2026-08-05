/** Client-side shape checks before calling Supabase OTP APIs. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function normalizeOtpCode(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

export function isValidOtpCode(code: string): boolean {
  return /^\d{6}$/.test(normalizeOtpCode(code));
}

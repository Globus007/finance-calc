import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Secondary magic-link path (token_hash → verifyOtp).
 * Primary auth for installed PWA is in-app email OTP (see /login).
 * Do not rely on PKCE ?code= cross-context exchange on mobile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Allowlist post-auth destinations only (no open redirects).
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw === "/month" ? "/month" : "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "auth");
  return NextResponse.redirect(redirectTo);
}

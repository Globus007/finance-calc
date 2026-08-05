import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { resolvePostAuthPath } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing (primary auth for default Supabase email templates).
 *
 * Handles both:
 * - PKCE: ?code=… (default ConfirmationURL → redirect_to)
 * - token_hash: ?token_hash=…&type=… (custom template / secondary)
 *
 * Session cookies are set via @supabase/ssr createServerClient.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = resolvePostAuthPath(searchParams.get("next"));

  const supabase = await createClient();
  let signedIn = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    signedIn = !error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    signedIn = !error;
  }

  if (signedIn) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "auth");
  return NextResponse.redirect(login);
}

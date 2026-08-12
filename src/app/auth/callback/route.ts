import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes the Supabase OAuth PKCE flow and stores the session in SSR cookies.
 * The callback never accepts a user-provided redirect target.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth/callback]", error.message);
    }
    return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

export const dynamic = "force-dynamic";

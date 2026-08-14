import { NextResponse } from "next/server";
import { LOGIN_QUERY_ERROR } from "@/lib/auth/login-query-error";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes the Supabase OAuth PKCE flow and stores the session in SSR cookies.
 * The callback never accepts a user-provided redirect target.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return redirectToLogin(requestUrl.origin);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth/callback]", error.message);
    }
    return redirectToLogin(requestUrl.origin);
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}

function redirectToLogin(origin: string) {
  const login = new URL("/login", origin);
  login.searchParams.set("error", LOGIN_QUERY_ERROR.oauth);
  return NextResponse.redirect(login);
}

export const dynamic = "force-dynamic";

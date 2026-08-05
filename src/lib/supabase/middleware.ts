import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthRedirect } from "@/lib/auth/route-policy";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  // Keep full setAll payloads so redirects retain path/secure/sameSite/maxAge.
  let cookiesToApply: CookieToSet[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Misconfigured env: do not invent a session. Send non-public paths to login.
    const redirectTo = resolveAuthRedirect({
      pathname: request.nextUrl.pathname,
      hasUser: false,
    });
    if (redirectTo) {
      const target = request.nextUrl.clone();
      target.pathname = redirectTo;
      return NextResponse.redirect(target);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToApply = cookiesToSet;
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Important: call getUser() right after createServerClient so refreshed
  // cookies are written onto supabaseResponse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = resolveAuthRedirect({
    pathname: request.nextUrl.pathname,
    hasUser: Boolean(user),
  });

  if (redirectTo) {
    const target = request.nextUrl.clone();
    target.pathname = redirectTo;
    const redirectResponse = NextResponse.redirect(target);
    cookiesToApply.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

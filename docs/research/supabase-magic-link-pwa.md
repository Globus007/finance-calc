# Research: Supabase magic link / OTP for mobile PWA sessions

**Ticket:** [#11](https://github.com/Globus007/finance-calc/issues/11)  
**Scope:** Single-user Next.js App Router PWA; email magic link and/or OTP; redirect URLs, PKCE, cookie vs localStorage, iOS Safari / installed PWA quirks.  
**Primary sources:** Supabase Auth docs, `@supabase/ssr` docs, Next.js Server-Side Auth tutorial (see [Sources](#sources)).  
**Date:** 2026-08-04

---

## Executive recommendation (MVP)

For a **single-user, online-first mobile PWA** on **Next.js + Supabase**:

| Choice | MVP decision |
| --- | --- |
| Auth factor | **Email 6-digit OTP** as the **primary** sign-in UX (user stays in the PWA) |
| Magic link | **Optional secondary**; only via **`token_hash` + server `verifyOtp`**, never rely on browser-only PKCE `?code=` exchange for mobile |
| Session storage | **Cookies via `@supabase/ssr`** — not `localStorage` |
| Flow type | **PKCE** (default with `@supabase/ssr`); code-verifier limitation is why OTP is preferred |
| Clients | `createBrowserClient` + `createServerClient` + **middleware/proxy** that refreshes session cookies |
| Signup | Disable open signup in product: seed/invite the one user; `shouldCreateUser: false` on OTP send |
| Redirect allowlist | Production Site URL + exact callback paths; localhost for dev; Vercel preview wildcards only if used |

**Why OTP wins for installed PWA:** On iOS, an installed PWA and Safari are **separate browsing contexts** (separate cookie jars). A magic-link click almost always opens **Safari**, not the standalone PWA, so a session established in Safari does not appear in the home-screen app. Entering a 6-digit code **inside the PWA** creates the cookie session in the context that matters.

---

## 1. Passwordless options (same API)

Supabase email passwordless uses **`signInWithOtp`**. Magic Link vs OTP differs mainly by **email template content**, not by a different client method.([Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless))

| Method | User action | Session establishment |
| --- | --- | --- |
| Magic Link | Click link in email | Redirect + verify (implicit fragments **or** SSR `token_hash` / PKCE `code`) |
| Email OTP | Type 6-digit `{{ .Token }}` in app | `verifyOtp({ email, token, type: 'email' })` returns session in response body |

Defaults (dashboard-configurable):

- Rate limit: one request per email about every **60 seconds**
- Link/OTP expiry: **1 hour** by default (same **Email OTP Expiration** setting also governs Magic Links and other email links)([Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless))

```ts
// Send (Magic Link by default template; OTP if template includes {{ .Token }})
await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    shouldCreateUser: false, // single-user MVP: account pre-provisioned
    emailRedirectTo: 'https://app.example.com/auth/confirm', // magic-link path only
  },
})

// OTP verify (same browser / PWA context — preferred for mobile PWA)
await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email',
})
```

---

## 2. Redirect URLs and Site URL

Configure under **Authentication → URL Configuration**.([Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls))

| Setting | Role |
| --- | --- |
| **Site URL** | Default redirect when no `redirectTo` / `emailRedirectTo` is passed. Must be production app origin (not `localhost`) in prod. |
| **Redirect URLs allow list** | Only listed URLs may be used as post-auth destinations (`emailRedirectTo`, OAuth `redirectTo`, etc.). |

**MVP allow list (example):**

```
http://localhost:3000/**
https://your-production-domain.com/**
https://your-production-domain.com/auth/confirm
```

If deploying previews on Vercel, Supabase documents:

```
https://*-<team-or-account-slug>.vercel.app/**
```

Prefer **exact production paths** over broad wildcards in production.([Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls))

App-side helper pattern (from Supabase docs; adapt env names):

```ts
const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000/'
  url = url.startsWith('http') ? url : `https://${url}`
  url = url.endsWith('/') ? url : `${url}/`
  return url
}
```

When using `emailRedirectTo`, email templates that build custom links should prefer `{{ .RedirectTo }}` over hard-coded `{{ .SiteURL }}` where appropriate.([Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates))

**PWA note:** Redirect targets must be **https origins of the web app**, not custom native schemes (`com.app://…`). Custom schemes are for native deep linking, which is out of scope for this PWA map.([Redirect URLs — mobile deep linking](https://supabase.com/docs/guides/auth/redirect-urls))

---

## 3. PKCE vs implicit; when code exchange breaks

### 3.1 Two flows

| Flow | How tokens arrive | SSR fit |
| --- | --- | --- |
| **Implicit** | Tokens in URL **fragment** (`#access_token=…`) | Server **cannot** read fragments → unsuitable for SSR cookie session setup |
| **PKCE** | Redirect with `?code=…`; client calls `exchangeCodeForSession(code)` | Required for server-side auth; default in `@supabase/ssr` |

Sources: [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

### 3.2 PKCE hard limitation (critical for PWA)

> The code verifier is created and stored **locally when the Auth flow is first initiated**. The code exchange must run on the **same browser and device** where the flow started.([PKCE flow — Limitations](https://supabase.com/docs/guides/auth/sessions/pkce-flow))

Auth code is **single-use** and valid about **5 minutes**.

Failure modes if the user starts login in the PWA and finishes the link in Safari (or another profile):

- `bad_code_verifier` / missing verifier  
- `flow_state_not_found` / `flow_state_expired`([Error codes](https://supabase.com/docs/guides/auth/debugging/error-codes))

### 3.3 Escape hatches that do **not** require the initiating-browser verifier

1. **`token_hash` in email → server `verifyOtp`**  
   Documented SSR path for Magic Link / confirm emails: customize template to:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a>
   ```

   Route handler calls `supabase.auth.verifyOtp({ token_hash, type })` and **writes session cookies**.([Passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Next.js tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs), [Email templates — SSR endpoint](https://supabase.com/docs/guides/auth/auth-email-templates))

2. **Email OTP (`{{ .Token }}`)**  
   Advanced SSR guide: for Phone/Email OTPs under PKCE, successful verify still returns an access token **in the response body** (no browser redirect / code-verifier dance).([SSR advanced guide — PKCE support](https://supabase.com/docs/guides/auth/server-side/advanced-guide))

### 3.4 Do **not** use default `{{ .ConfirmationURL }}` alone for SSR PWA

Default confirmation URLs hit Supabase Auth then redirect with session material that is awkward for cookie SSR (fragments / PKCE code without a carefully shared verifier). Supabase’s Next.js SSR tutorial explicitly switches templates to **`token_hash` + `/auth/confirm`**.([Next.js user management tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs))

---

## 4. Cookie sessions vs localStorage

| Storage | Readable by Next.js server | Recommended for this stack |
| --- | --- | --- |
| **localStorage** (default non-SSR `supabase-js`) | No | No for App Router SSR |
| **Cookies via `@supabase/ssr`** | Yes | **Yes** |

From the SSR advanced guide: access + refresh tokens must live in a medium the **server and browser share**; that medium is **cookies**. `@supabase/ssr` defaults to **PKCE** and configures cookie storage.([SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client))

### 4.1 Client split (Next.js)

1. **Browser:** `createBrowserClient` from `@supabase/ssr` (cookie-backed; singleton-friendly).  
2. **Server Components / Route Handlers / Server Actions:** `createServerClient` with `cookies.getAll` / `setAll` from `next/headers`.  
3. **Middleware / Proxy:** refresh session on each matched request (`getClaims()` or `getUser()` early so refreshed cookies can be written). Server Components alone **cannot** reliably persist refreshed cookies.([Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs))

Default cookie name pattern: `sb-<project_ref>-auth-token`.

### 4.2 Cookie attribute guidance (from Supabase)

| Topic | Guidance |
| --- | --- |
| **HttpOnly** | Not required; browser client needs refresh token access. |
| **Max-Age** | Do not shorten aggressively — refresh token is the long-lived session handle. |
| **SameSite** | **`Lax`** is a good default (sends cookies on top-level navigations to your site). |
| **Secure** | Use on HTTPS production. |
| **Auth checks** | Prefer **`getClaims()`** (JWT validation) to protect pages; **`getUser()`** when you need a live Auth-server user; do **not** trust `getSession()` alone for authorization on the server.([SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)) |

### 4.3 Caching / multi-tenant session leaks

If a response that includes `Set-Cookie` after token refresh is **CDN/ISR-cached**, another user can receive the wrong session. Apply `Cache-Control: private, no-store` (handled via `setAll` headers in current `@supabase/ssr`); avoid ISR on authenticated routes; never share a module-scoped Supabase client across requests (Vercel Fluid).([SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide))

---

## 5. iOS Safari / installed PWA quirks (implications)

Supabase does not publish a dedicated “iOS PWA Auth” guide; the following follows from PKCE storage rules + standard WebKit PWA behavior + documented email-link pitfalls.

| Quirk | Effect on Supabase auth | Mitigation |
| --- | --- | --- |
| **Standalone PWA ≠ Safari cookie jar** (iOS) | Login completed in Safari does not session the home-screen PWA | Prefer **in-app OTP**; if using magic link, accept that user may land in Safari and must re-open PWA only if cookies are first-party and contexts were unified (they usually are not) |
| **Email app opens links in Safari** | Magic link never returns to the PWA WebView | OTP primary; optional “open in app” instructions are weak on iOS |
| **PKCE code verifier local to initiator** | Safari cannot complete `exchangeCodeForSession` started in PWA | Use `token_hash`/`verifyOtp` or OTP, not `?code=` alone |
| **Email security prefetch** (Safe Links, etc.) | One-click `ConfirmationURL` consumed → “token expired/invalid” | Prefer OTP; or intermediate page with button; avoid relying on auto-verify GET.([Email templates — prefetch](https://supabase.com/docs/guides/auth/auth-email-templates), [OTP failures troubleshooting](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0)) |
| **Email tracking rewrites links** | Broken redirects | Disable tracking on transactional provider.([Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)) |
| **ITP / third-party cookies** | Low risk if app and cookies are **first-party** on your domain | Host app on own domain; avoid third-party auth iframe patterns |
| **Long-lived session after first login** | User rarely re-auths on phone | Cookie refresh via middleware; keep refresh token path healthy |

---

## 6. Concrete MVP auth flow

### 6.1 Stack pieces

```
lib/supabase/client.ts   → createBrowserClient
lib/supabase/server.ts    → createServerClient (cookies from next/headers)
lib/supabase/middleware.ts + middleware.ts (or Next.js proxy convention)
app/login/page.tsx        → email form → signInWithOtp
app/login/verify UI       → 6-digit input → verifyOtp
app/auth/confirm/route.ts → optional magic-link: verifyOtp(token_hash)
```

Packages: `@supabase/supabase-js`, `@supabase/ssr`.([Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client))

### 6.2 Happy path (primary): Email OTP

```
┌─────────────┐   signInWithOtp(email)    ┌──────────────┐
│  PWA /login │ ────────────────────────► │ Supabase Auth│
│  (cookies)  │                           │ sends email  │
└──────┬──────┘                           └──────────────┘
       │ user reads mail on phone
       │ enters 6-digit code in PWA
       ▼
  verifyOtp({ email, token, type: 'email' })
       │
       ▼
  Session cookies set (browser client or server action)
       │
       ▼
  middleware refreshes on navigation; app routes require getClaims()/getUser()
```

**Email template (Magic Link template used for OTP delivery):** include the code, e.g.:

```html
<h2>Код входа</h2>
<p>Ваш код: <strong>{{ .Token }}</strong></p>
<p>Код действует ограниченное время. Не пересылайте его.</p>
```

([Passwordless — OTP template](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates))

### 6.3 Secondary path: Magic link via `token_hash` (desktop / Safari-tolerant)

**Template:**

```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Войти</a></p>
<!-- Optional hybrid: also show {{ .Token }} for PWA users -->
```

**Route** `app/auth/confirm/route.ts` (pattern from Supabase Next.js tutorial):

```ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = '/'
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'auth')
  return NextResponse.redirect(redirectTo)
}
```

([Next.js tutorial — confirmation endpoint](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs))

**Reality check:** On iOS this still typically authenticates **Safari**. Useful for desktop and for “open site in browser”; **not** a substitute for OTP for the installed PWA.

### 6.4 Hybrid email (recommended content)

One email can ship **both** `{{ .Token }}` and a `token_hash` link so:

- Phone PWA users type the code  
- Desktop users click the link  

Same `signInWithOtp` call; template decides presentation.([Passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless))

### 6.5 Single-user policy

- Create the sole user in Supabase Dashboard (or invite) before launch.  
- Call `signInWithOtp` with `shouldCreateUser: false` so random emails cannot mint accounts.([Passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless))  
- Optionally restrict at app layer: reject any session whose email ≠ allowlisted address (defense in depth with RLS).

### 6.6 Middleware responsibilities

- Create server client from request cookies.  
- Call `getClaims()` / `getUser()` early so refresh + `Set-Cookie` succeed.  
- Redirect unauthenticated users from app routes to `/login`.  
- Return the **same** response object that received cookie writes.  
- Set cache headers when provided by `setAll`.([Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide))

### 6.7 What we explicitly **do not** recommend for MVP

| Avoid | Reason |
| --- | --- |
| Pure `localStorage` sessions | No SSR, no middleware protection with shared session |
| Implicit flow only | Fragments invisible to server |
| Relying on `exchangeCodeForSession` after email open on mobile | PKCE verifier / context mismatch |
| Default `{{ .ConfirmationURL }}` without SSR confirm route | Poor SSR cookie setup; prefetch risk |
| Native deep-link schemes | Out of scope (PWA-only map) |
| Short cookie Max-Age as “security” | Degrades refresh UX without real logout semantics |

---

## 7. Configuration checklist (build time)

**Supabase Dashboard**

- [ ] Email provider enabled (default).  
- [ ] Site URL = production origin.  
- [ ] Redirect allow list includes production `/auth/confirm` and localhost.  
- [ ] Magic Link / OTP template: `{{ .Token }}` (+ optional `token_hash` link).  
- [ ] Confirm signup / recovery templates updated if those flows are used (`token_hash` pattern).  
- [ ] Disable public signups if product is truly single-user (and/or `shouldCreateUser: false`).  
- [ ] Seed the one user.  
- [ ] Review Email OTP expiration (default 1h; keep ≤ 1 day).  

**Next.js app**

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, publishable key, `NEXT_PUBLIC_SITE_URL`.  
- [ ] `@supabase/ssr` browser + server clients.  
- [ ] Middleware/proxy session refresh.  
- [ ] `/login` OTP UI + server or client `verifyOtp`.  
- [ ] Optional `/auth/confirm` for magic-link `token_hash`.  
- [ ] Protected routes use `getClaims()` / `getUser()`, not raw `getSession()` for authz.  
- [ ] No ISR/CDN caching on authenticated HTML that may `Set-Cookie`.  

**PWA**

- [ ] Manifest + service worker as usual; auth remains **network online-first**.  
- [ ] Login UI usable offline only as “you must be online to sign in” (no offline credential cache in MVP).  
- [ ] After first successful OTP, session cookies should persist across PWA restarts until refresh token revocation/expiry.  

---

## 8. Decision summary (for map / ADRs)

1. **Session:** cookie-based SSR auth with `@supabase/ssr` (not localStorage).  
2. **Flow:** PKCE defaults from SSR package; **do not** depend on cross-context PKCE code exchange for mobile.  
3. **Primary UX:** email **OTP** entered in the PWA.  
4. **Secondary UX:** magic link via **`/auth/confirm?token_hash=…`** + `verifyOtp` for browser/desktop.  
5. **Redirects:** strict Site URL + allow list; `emailRedirectTo` only for link path.  
6. **Single user:** pre-provision account; `shouldCreateUser: false`.  

These are **spec decisions**, not an implementation in this ticket.

---

## Sources

Primary documentation used:

1. [Passwordless email logins (Magic Link & OTP)](https://supabase.com/docs/guides/auth/auth-email-passwordless)  
2. [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)  
3. [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)  
4. [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)  
5. [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)  
6. [SSR Auth advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)  
7. [Build a User Management App with Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)  
8. [Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes)  
9. [OTP verification failures (prefetch / expired)](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0)  
10. `@supabase/ssr` package behavior (cookie clients, middleware `getClaims` / `setAll`) — [supabase/ssr](https://github.com/supabase/ssr)

---

## Out of scope for this note

- OAuth / Apple / Google sign-in  
- Native iOS/Android deep links  
- MFA / TOTP  
- Offline-first encrypted session stores  
- Multi-user invite flows  
- Custom SMTP deliverability beyond “disable link tracking / beware Safe Links”

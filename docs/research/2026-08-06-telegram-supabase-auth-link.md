# Telegram identity → Supabase Auth session linking

**Date:** 2026-08-06  
**Issue:** [#46 Research: Telegram identity to Supabase Auth session linking](https://github.com/Globus007/finance-calc/issues/46)  
**Map:** [#43 Wayfinder: Telegram surface (Mini App + chat capture)](https://github.com/Globus007/finance-calc/issues/43)  
**Branch:** `research/telegram-supabase-auth-link`

**Product context (this repo):** Next.js + Supabase Auth, email OTP with `shouldCreateUser: false`, pre-provisioned single user (`src/app/login/actions.ts`). Charting lean: Telegram identity linked to that same Supabase user; email OTP remains for browser/PWA. This note is fact-finding only — **no production auth code**.

---

## 1. Executive summary

| Question | Finding |
|----------|---------|
| How to prove Telegram Mini App identity? | **Server-only** HMAC validation of `Telegram.WebApp.initData` with the bot token (official algorithm). Optionally Ed25519 `signature` for third-party validators without the bot token. |
| Is Telegram a Supabase Auth provider? | **No.** Not in built-in social providers; not in first-class third-party list (Clerk/Firebase/Auth0/Cognito/WorkOS). `signInWithIdToken` OpenAPI providers: `google`, `apple`, `azure`, `facebook`, `keycloak` only. |
| Official Telegram+Supabase combined recipe? | **None.** Patterns below compose **documented** Telegram validation with **documented** Supabase session APIs. |
| Best fit for this single-user Mini App lean? | **Validate `initData` on the server → allowlist `telegram_id` → issue a normal Supabase session for the existing `auth.users` row** via service-role `admin.generateLink({ type: 'magiclink' })` + `verifyOtp({ token_hash, type: 'magiclink' })` on the cookie-aware SSR client (same session shape as email OTP). |
| Login Widget / Telegram OIDC? | Useful for **website** login or experimental custom OIDC; **not** the seamless Mini App path (different crypto/payload; ID token has no email in Telegram’s sample claims). |
| Coexist with email OTP? | **Yes.** Same user row, alternate session initiation. Keep OTP for browser/PWA. |

**Primary sources:** [Telegram Mini Apps](https://core.telegram.org/bots/webapps), [Telegram Login (OIDC)](https://core.telegram.org/widgets/login), [Login Widget legacy](https://core.telegram.org/widgets/login-legacy), [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts), [Sessions](https://supabase.com/docs/guides/auth/sessions), [Third-party auth](https://supabase.com/docs/guides/auth/third-party/overview), [Custom OAuth/OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers), [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [Signing keys / minting](https://supabase.com/docs/guides/auth/signing-keys), [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [signInWithIdToken](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken), Auth OpenAPI (`POST /token` `grant_type=id_token` provider enum).

---

## 2. Cryptographic validation of Telegram identity

### 2.1 Mini App `initData` (primary for finance-calc Mini App)

**Client surface (untrusted until validated):**

- `Telegram.WebApp.initData` — raw query string; **send this to your backend**.
- `Telegram.WebApp.initDataUnsafe` — parsed object; Telegram docs warn **do not trust** it alone.

**`WebAppInitData` fields relevant to auth** (after validation):

| Field | Role |
|-------|------|
| `user` | `WebAppUser` JSON; **`user.id`** is the stable Telegram user id (≤52 significant bits — store as string/bigint, not 32-bit int) |
| `auth_date` | Unix seconds when the Mini App received the data |
| `hash` | HMAC integrity tag for bot-token validation |
| `signature` | Ed25519 tag for third-party validation (no bot token) |

**Official bot-token validation algorithm** ([Validating data received via the Mini App](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)):

1. Parse `initData` as `application/x-www-form-urlencoded` field-value pairs.
2. Take all pairs **except** `hash`.
3. Sort by key ascending; build **data-check-string**: `key=value` lines joined with `\n` (0x0A).
4. `secret_key = HMAC_SHA256(key = "WebAppData", message = bot_token)`  
   (Telegram’s pseudocode: `HMAC_SHA256(<bot_token>, "WebAppData")` — constant string is the HMAC key.)
5. Accept iff `hex(HMAC_SHA256(key = secret_key, message = data_check_string)) === hash`.
6. **Additionally** reject stale `auth_date` (see §4).

After validation, parse `user` as JSON and read `id`.

**Third-party Ed25519 path** (optional): validate `signature` with Telegram’s published public keys and a data-check-string that **prepends** `{bot_id}:WebAppData\n` then sorted fields excluding `hash` and `signature`. Use when a component must verify without the bot token. Production pubkey (hex): `e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d`.

**What never runs in the client:** bot token, secret key derivation, acceptance decision. Client only obtains and transmits `initData`.

### 2.2 Login Widget (legacy HMAC) — secondary

[Checking authorization](https://core.telegram.org/widgets/login-legacy#checking-authorization):

- Fields: `id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`.
- **Different secret:** `secret_key = SHA256(bot_token)` (not WebAppData HMAC).
- Same style data-check-string + `hex(HMAC_SHA256(data_check_string, secret_key)) == hash`.
- Check `auth_date` freshness.

Relevant if a **browser** “Log in with Telegram” button is added later; **not** required for Mini App `initData`.

### 2.3 Telegram Login OIDC (current Login docs)

[Log In With Telegram](https://core.telegram.org/widgets/login):

- Discovery: `https://oauth.telegram.org/.well-known/openid-configuration`
- JWKS: `https://oauth.telegram.org/.well-known/jwks.json`
- Authorization Code + PKCE; Client ID / Secret from BotFather **Login Widget** settings; Allowed URLs pre-registered.
- Validate `id_token`: signature via JWKS; `iss == https://oauth.telegram.org`; `aud` = bot Client ID; `exp` not past.
- Sample claims include `sub`, `id`, `name`, `preferred_username`, `picture`, optional `phone_number` — **no email** in Telegram’s published example.

This is a standards OIDC ID token path (browser/native SDK), distinct from Mini App `initData`.

---

## 3. Mapping `telegram_id` → existing `auth.users` and issuing a Supabase session

### 3.1 Gaps (be explicit)

1. **No official “Telegram → Supabase session” guide.** Compositions are inferred from separate docs.
2. **Telegram is not a Supabase identity provider.** `linkIdentity` / automatic linking apply to configured OAuth/OIDC providers (email-based automatic linking). Mini App `user.id` is **app-owned linkage**, not `auth.identities` provider `telegram`.
3. **`signInWithIdToken` does not list Telegram.** Auth OpenAPI `POST /token` `grant_type=id_token` provider enum: `google | apple | azure | facebook | keycloak`.
4. **Automatic OAuth linking needs verified email.** Telegram OIDC sample tokens omit email → cannot rely on “same email → same user” for Telegram.
5. **Custom JWT minting** can authorize Data API with `sub` + `role` but is a different session model than Auth-issued access/refresh pairs (`auth.sessions`). Prefer Auth-issued sessions for this Next.js SSR cookie stack.

### 3.2 Repo baseline (relevant)

- Email OTP: `signInWithOtp({ shouldCreateUser: false })` + `verifyOtp` / `exchangeCodeForSession` (`src/app/login/actions.ts`, `src/app/auth/confirm/route.ts`).
- SSR cookies: `@supabase/ssr` `createServerClient` (`src/lib/supabase/server.ts`).
- Service role already isolated: `createAdminClient()` (`src/lib/supabase/admin.ts`) — storage only today; suitable host for admin auth calls **server-only**.

### 3.3 Pattern A — Recommended: validate `initData` + magiclink mint for existing user

**Goal:** After proving Telegram identity, create a **normal** Supabase Auth session for the **pre-existing** single user (same cookies / RLS / refresh as OTP).

**Documented building blocks:**

1. **Admin `generateLink`** — [JS reference](https://supabase.com/docs/reference/javascript/auth-admin-generatelink); returns `properties.hashed_token`, `email_otp`, `action_link`, `verification_type` (SDK types in `@supabase/auth-js` `GenerateLinkProperties`). Types include `magiclink`. Service role required.
2. **`verifyOtp({ token_hash, type })`** — [docs](https://supabase.com/docs/reference/javascript/auth-verifyotp); established SSR path in this repo for magic-link style completion (`type` + `token_hash`). Auth `POST /verify` accepts `token_hash` with types including `magiclink`.
3. Resulting session is a standard Auth session (access JWT + refresh token, `auth.sessions` row) per [Sessions](https://supabase.com/docs/guides/auth/sessions).

**Logical flow (specification sketch, not implementation):**

```
Mini App (WebView)
  → POST /api/... { initData: Telegram.WebApp.initData }
Server (Route Handler / Server Action)
  1. HMAC-validate initData with BOT_TOKEN
  2. Reject if now - auth_date > MAX_AGE
  3. telegram_id = String(user.id)
  4. Resolve mapped auth user (allowlist):
       - single-user: env TELEGRAM_USER_ID must equal telegram_id
         and/or auth.users.app_metadata.telegram_id pre-set by admin
       - never create user; reject unknown ids
  5. admin.generateLink({ type: 'magiclink', email: that_user.email })
  6. On cookie SSR client (anon key + cookies): 
       verifyOtp({ type: 'magiclink', token_hash: properties.hashed_token })
  7. Session cookies set → redirect or 204; Mini App continues as authenticated app
```

**Why this fits product constraints:**

- Single pre-provisioned user; no Telegram-driven signup.
- Reuses Auth session machinery already used by email OTP / magic link.
- Mapping is explicit allowlist (env and/or `app_metadata`), not “trust Telegram to create identities.”
- Service role stays server-side; hashed_token should be consumed **on the server** in the same request (do not return long-lived mint secrets to the client).

**Caveats / honesty:**

- Supabase documents `generateLink` as “email links and OTPs to be sent via a custom email provider.” Using `hashed_token` immediately server-side without sending email is a **common composition** of public APIs, not a named “Telegram login” product feature.
- `generateLink` for `magiclink` is described as able to create users in some type notes — **always** resolve an existing email first; keep signup disabled / never pass unknown emails.
- Rate-limit this endpoint; each call mints a one-time token.

**Binding `telegram_id` (app data, not Supabase identity provider):**

| Store | Notes |
|-------|--------|
| Env `ALLOWED_TELEGRAM_ID` | Simplest single-user; deploy-time bind |
| `auth.users.raw_app_meta_data.telegram_id` via admin `updateUserById` | Queryable; admin-only write |
| Private table `telegram_links(telegram_id, user_id)` | Overkill for single-user MVP |

Do **not** put bot token or service role in client bundles. Do **not** let the client choose `user_id`.

### 3.4 Pattern B — Custom OIDC provider = Telegram Login OIDC

Supabase [Custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) (2026): configure issuer `https://oauth.telegram.org`, client id/secret from BotFather, then `signInWithOAuth({ provider: 'custom:…' })`.

| Pros | Cons for this product |
|------|------------------------|
| Official OIDC on both sides | Browser/OIDC redirect or popup — not Mini App `initData` seamlessness |
| Supabase verifies ID tokens via JWKS | Telegram sample ID token **has no email** → auto-link to existing email user fails; `email_optional: true` risks a **second** Auth user |
| | Mini App still needs Pattern A-style `initData` for in-WebView silent auth |
| | Login Widget Allowed URLs / COOP constraints on site |

**Verdict:** Possible for a **website** “Sign in with Telegram” experiment; **not** the primary Mini App path. Linking to the existing email account would need a deliberate manual/admin step, not automatic email match.

### 3.5 Pattern C — Externally minted JWT (imported signing key)

[JWT Signing Keys — minting](https://supabase.com/docs/guides/auth/signing-keys): import private key; mint JWT with `sub` (user UUID), `role: authenticated`, short `exp`; send `Authorization: Bearer` or client `accessToken` option ([JWTs guide](https://supabase.com/docs/guides/auth/jwts#using-custom-or-third-party-jwts)).

| Pros | Cons |
|------|------|
| No email magiclink hop | Not a full Auth session with refresh lifecycle unless you build that yourself |
| Direct Data API / RLS as `sub` | `getClaims()` is for Supabase-issued JWTs; external mint needs own verification |
| | Symmetric legacy JWT secret minting is **discouraged**; private keys not extractable once managed by platform |

**Verdict:** Prefer Pattern A for the Next.js cookie session product. Consider C only for non-browser callers (e.g. future server-side bot worker acting as the user) if carefully designed.

### 3.6 Pattern D — Third-party auth trust of external JWTs

[Third-party auth overview](https://supabase.com/docs/guides/auth/third-party/overview): first-class list is Clerk, Firebase, Auth0, Cognito, WorkOS; generic OIDC issuer JWKS also appears in management types. Requirements: asymmetric JWTs, `kid`, discovery. **Does not replace** app-level “only our one Telegram user” policy and is orthogonal to SSR cookie sessions from Auth.

### 3.7 `signInWithIdToken` — not applicable to Telegram today

Documented for configured providers (Google, Apple, etc.). No Telegram provider string in the Auth API enum. Passing a Telegram OIDC `id_token` without a matching configured provider is **unsupported**.

### 3.8 Bot chat channel (out of scope detail, one line)

Chat capture identity is the Bot API `message.from.id`, authenticated by webhook secret / Telegram delivery — not `initData`. Map the same `telegram_id` allowlist; do not reuse Mini App HMAC on arbitrary chat JSON.

---

## 4. Security requirements

### 4.1 Replay / freshness (`auth_date`)

Telegram: check `auth_date` to prevent use of **outdated** data; **no fixed official max age** in the Mini App docs.

**Recommendation for session exchange (stricter than generic “display name” use):**

| Use | Suggested max age |
|-----|-------------------|
| Exchange `initData` for Supabase session | **60–300 seconds** (treat as one-shot login credential) |
| Upper bound if network retries | ≤ **24 hours** absolute refuse |

Also consider:

- One-time server nonce or short-lived server challenge if replaying the same `initData` within the window is a concern (Telegram does not provide a single-use jti on `initData`; `hash` is stable for that payload).
- Rate limits per IP and per `telegram_id`.

### 4.2 Bot token secrecy

- Store as server env (e.g. `TELEGRAM_BOT_TOKEN`) — **never** `NEXT_PUBLIC_*`.
- Same secrecy class as `SUPABASE_SERVICE_ROLE_KEY`.
- Rotate bot token in BotFather if leaked; invalidates HMAC secrets immediately.
- Client may load `telegram-web-app.js` and read `initData` only.

### 4.3 Server-only validation

| Must be server-side | May be client-side |
|---------------------|--------------------|
| HMAC / Ed25519 verify | Read `initData`, POST to backend |
| `auth_date` policy | Telegram UI (MainButton, theme) |
| telegram_id allowlist | |
| `generateLink` / service role | |
| Session cookie write via SSR client | |

Constant-time compare for MAC equality (avoid early-exit string `===` if possible).

### 4.4 Single-user authorization (beyond authentication)

Proving “this request is from Telegram user X” is insufficient. Product requires **X is the owner**:

- Hard allowlist of one `telegram_id`.
- Reject all others with generic 401 (no enumeration of “wrong id vs bad hash” if avoidable).
- Never `shouldCreateUser: true` on this path.

### 4.5 Session security alignment

Once issued, sessions follow Supabase [session settings](https://supabase.com/docs/guides/auth/sessions) (JWT expiry, refresh reuse detection, optional single-session / time-box on Pro). Prefer same settings for OTP and Telegram-minted sessions.

### 4.6 Login Widget / OIDC extras

- Register only production Allowed URLs / redirect URIs.
- Use `nonce` / `state` as Telegram documents for OIDC anti-replay/CSRF.
- Watch `Cross-Origin-Opener-Policy` vs popup Login library (Telegram warns `same-origin` breaks the popup).

---

## 5. Coexistence with email OTP (browser / PWA)

| Surface | Auth mechanism | Same `auth.users`? |
|---------|----------------|--------------------|
| Browser / installed PWA | Email OTP (`signInWithOtp` + `verifyOtp`) and secondary magic link (`/auth/confirm`) | Yes (existing) |
| Telegram Mini App | Pattern A (`initData` → mint session for same user) | Yes (target) |
| Optional future website TG button | Login Widget / OIDC — only if explicitly linked | Risk of second user if misconfigured |

Implications:

- **Do not remove** email OTP; charting lean keeps it for browser/PWA (cookie jar / no Telegram WebView).
- Both paths should set the **same SSR session cookie shape** so middleware (`src/lib/supabase/middleware.ts`) and `getUser()` continue unchanged.
- Logout / session limits apply to both.
- Pre-provisioning and `shouldCreateUser: false` remain the signup policy; Telegram must not become an open registration vector.
- If both surfaces are signed in, multiple sessions may exist unless “single session per user” is enabled in Auth settings.

---

## 6. Comparison matrix (for later spec / decision ticket)

| Approach | Mini App UX | Maps to existing user | Official support story | Risk |
|----------|-------------|----------------------|------------------------|------|
| **A. initData + generateLink/verifyOtp** | Seamless | Explicit allowlist | Compose public APIs | App must implement validation + binding carefully |
| B. Custom OIDC (Telegram Login) | Poor fit (redirect) | Weak (no email) | Custom OIDC docs | Accidental second user |
| C. Mint JWT with imported key | Possible | Via `sub` | Signing keys docs | Weak refresh/session story for SSR app |
| D. Third-party JWT trust | N/A as sole login | External `sub` | Third-party auth docs | Not Auth cookie sessions |
| signInWithIdToken(telegram) | — | — | **Not supported** | — |

**Research recommendation for #43 lean:** adopt **Pattern A** in a future implementation ticket; keep email OTP; store one allowlisted `telegram_id`; document bot token + service role as server secrets. Treat Login Widget/OIDC as non-goals for MVP Mini App unless browser TG login is separately desired.

---

## 7. Implementation-facing checklist (for a later ticket — not done here)

1. Env: `TELEGRAM_BOT_TOKEN`, `ALLOWED_TELEGRAM_ID` (or admin metadata bind).
2. Server module: `validateWebAppInitData(initData, botToken) → { userId, authDate } | error`.
3. Route: exchange initData → session; rate limit; no user creation.
4. Mini App bootstrap: if `window.Telegram?.WebApp?.initData`, call exchange once; else fall through to existing login (browser).
5. Tests: known-vector HMAC fixtures; expired `auth_date`; wrong bot token; wrong telegram id.
6. Ops: bot token rotation runbook; no token in client logs.

---

## 8. Source index

| Topic | URL |
|-------|-----|
| Mini Apps + initData validation | https://core.telegram.org/bots/webapps |
| Third-party initData Ed25519 | https://core.telegram.org/bots/webapps#validating-data-for-third-party-use |
| Login Widget legacy HMAC | https://core.telegram.org/widgets/login-legacy |
| Telegram Login OIDC | https://core.telegram.org/widgets/login |
| Supabase sessions | https://supabase.com/docs/guides/auth/sessions |
| Supabase JWTs / custom accessToken | https://supabase.com/docs/guides/auth/jwts |
| JWT signing keys / mint | https://supabase.com/docs/guides/auth/signing-keys |
| Third-party auth | https://supabase.com/docs/guides/auth/third-party/overview |
| Custom OAuth/OIDC | https://supabase.com/docs/guides/auth/custom-oauth-providers |
| Identity linking | https://supabase.com/docs/guides/auth/auth-identity-linking |
| admin.generateLink | https://supabase.com/docs/reference/javascript/auth-admin-generatelink |
| verifyOtp | https://supabase.com/docs/reference/javascript/auth-verifyotp |
| signInWithIdToken | https://supabase.com/docs/reference/javascript/auth-signinwithidtoken |

---

## 9. Bottom line

Telegram can securely identify the Mini App user via **server-side `initData` HMAC**. Supabase will not do that for you and will not treat Telegram as a built-in IdP. For finance-calc’s **single existing user**, the evidence-backed path is: **prove `telegram_id` → allowlist → mint a normal Auth session for that user’s email via admin magiclink token + `verifyOtp`**, leaving **email OTP** as the browser/PWA path. There is **no** single official “Telegram Login for Supabase” recipe; the gap is integration design, not missing HMAC or missing session APIs.

# Telegram identity link and session UX (MVP)

MVP links Telegram identity to the existing Supabase Auth user for Mini App and bot surfaces **without** self-serve bind/unlink UI. Mapping is **multi-user-ready** from day one (durable 1:1 store), even while the product is still single-user. Email OTP remains the browser/PWA path. Technical composition (server HMAC of Mini App `initData` → mint a normal Auth session for the mapped user) follows research #46; this ADR locks **product** link UX and authorization policy.

## First bind (proof of ownership)

- **Ops/admin seed only:** an operator writes the durable mapping row (`telegram_id` ↔ `auth.users.id`). End users never complete a “link account” ceremony in Mini App, bot, or web settings.
- Ownership of the finance account is assumed by **ops** (who may seed), not by in-product OTP-to-Telegram proof.
- Future multi-user **self-serve** link is out of this decision; until then, ops seeds **per user**.

## Mapping store and cardinality

- **1:1:** one `telegram_id` maps to exactly one user; one user has at most one `telegram_id`.
- **Durable app-owned store** is the source of truth for authorization (not deploy env alone). Env may bootstrap local/dev; production lookup always uses the store.
- Unlink / rebind in product is **out of MVP**; change of Telegram identity is ops delete + reseed.

## Surfaces

| Surface | Behavior |
|---------|----------|
| **Mini App**, mapped `telegram_id` | **Silent session on every cold start:** client sends `initData` → server validates HMAC + freshness → store lookup → mint Supabase Auth session (same cookie/SSR shape as email OTP) → app. No login form. |
| **Mini App**, unmapped / invalid or stale `initData` / mint failure | **Telegram-specific deny** with **distinct** user-facing copy. **No** email OTP fallback inside the Telegram WebView. |
| **Same URL outside Telegram** (no `initData`) | Existing **browser/PWA** path: email OTP. Not treated as a failed Telegram login. |
| **Bot** | Same store via `message.from.id`. No chat login/OTP. Unmapped → short deny. Capture and other bot actions run server-side only for mapped users. |
| **Web settings** | No Telegram link status/bind/unbind UI in MVP. |

## Deny matrix (user-facing)

1. **Unmapped** `telegram_id` (including “wrong” Telegram account): Mini App — access not configured; bot — no access.
2. **Invalid or stale `initData`:** close and reopen the Mini App.
3. **Session mint / server failure:** try again later.
4. **Already linked** conflicts: enforced by 1:1 uniqueness at seed time (ops error); not an end-user rebind flow.

Do not collapse all failures into one message when the recovery action differs (reopen vs wait vs contact ops).

## Considered options

- **Self-serve first link** (email OTP in Mini App, one-time code from web, bot `/start` token) — deferred: correct for multi-user product UX later; unnecessary ceremony and attack surface while ops can seed one (or few) users.
- **Env-only `ALLOWED_TELEGRAM_ID` as sole prod allowlist** — rejected as long-term model: not multi-user-ready; store is source of truth.
- **Silent initData exchange only when Supabase session missing** — rejected for MVP policy: **every cold start** re-proves Telegram identity via `initData` then mints session (simpler threat model; accept mint churn / rate limits).
- **Email OTP fallback inside Mini App on fail** — rejected: blurs admin-seed policy and widens in-TG auth surface.
- **Telegram Login Widget / OIDC on web** — non-goal for MVP (research #46 Pattern B poor fit for Mini App; risk of second Auth user).
- **N Telegram identities per one user** — rejected: Telegram user id is stable; 1:1 keeps deny/unlink semantics simple.
- **Force “open in Telegram only” even without `initData` on shared origin** — rejected: same origin must keep browser/PWA email OTP.

## Consequences

- Implementation needs a durable 1:1 mapping + ops seed path before Mini App/bot can authorize anyone.
- Mini App bootstrap always attempts `initData` session exchange on cold start when Telegram WebApp is present; otherwise falls through to existing login.
- Bot and Mini App share one authorization notion: presence in the mapping store.
- Map item “first-time Telegram ↔ Supabase user link UX” (#47) is closed by this ADR; self-serve link/unlink is a later ticket when multi-user onboarding is productized.

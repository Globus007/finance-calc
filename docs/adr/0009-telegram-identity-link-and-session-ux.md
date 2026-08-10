# Telegram identity link and session UX (MVP)

MVP links Telegram identity to the existing Supabase Auth user for **bot** authorization (and, historically, for a Mini App path) **without** self-serve bind/unlink UI. Mapping is **multi-user-ready** from day one (durable 1:1 store), even while the product is still single-user. Email OTP remains the browser/PWA path.

**Surface-roles amend (current product):** under [Grilling: Surface roles — PWA primary, bot Expense-only (no Mini App)](https://github.com/Globus007/finance-calc/issues/67), Telegram product work is **chat bot only**. The **durable mapping + bot deny-when-unmapped** rules below remain **normative**. **Mini App silent session mint** (initData → Auth session) is **not a deliverable** of the current Telegram surface plan—keep the Mini App rows as **historical / reserved** policy if Mini App returns later; do not implement them as part of bot Expense capture.

Technical composition for Mini App (server HMAC of `initData` → mint a normal Auth session for the mapped user) still follows research #46 if that surface is revived; this ADR locks **product** link UX and authorization policy.

## First bind (proof of ownership)

- **Ops/admin seed only:** an operator writes the durable mapping row (`telegram_id` ↔ `auth.users.id`). End users never complete a “link account” ceremony in bot, web settings, or (if revived) Mini App.
- Ownership of the finance account is assumed by **ops** (who may seed), not by in-product OTP-to-Telegram proof.
- Future multi-user **self-serve** link is out of this decision; until then, ops seeds **per user**.

## Mapping store and cardinality

- **1:1:** one `telegram_id` maps to exactly one user; one user has at most one `telegram_id`.
- **Durable app-owned store** is the source of truth for authorization (not deploy env alone). Env may bootstrap local/dev; production lookup always uses the store.
- Unlink / rebind in product is **out of MVP**; change of Telegram identity is ops delete + reseed.

## Surfaces

| Surface | Behavior |
|---------|----------|
| **Bot** (normative for current plan) | Same store via `message.from.id` (and callback sender id). No chat login/OTP. Unmapped → short deny. Capture and other bot actions run server-side only for mapped users. |
| **Browser/PWA** (same origin, no Telegram) | Existing **email OTP**. Not treated as a failed Telegram login. |
| **Mini App**, mapped `telegram_id` | **Historical / not a current deliverable:** silent session on every cold start (`initData` → HMAC + freshness → store lookup → mint Supabase Auth session, same cookie/SSR shape as email OTP). No login form. Revisit only if Mini App product work is reopened. |
| **Mini App**, unmapped / invalid or stale `initData` / mint failure | **Historical / not a current deliverable:** Telegram-specific deny with **distinct** user-facing copy. **No** email OTP fallback inside the Telegram WebView. |
| **Web settings** | No Telegram link status/bind/unbind UI in MVP. |

## Deny matrix (user-facing)

1. **Unmapped** `telegram_id` (including “wrong” Telegram account): bot — no access; Mini App (if ever shipped) — access not configured.
2. **Invalid or stale `initData`:** (Mini App only, if revived) close and reopen the Mini App.
3. **Session mint / server failure:** (Mini App only, if revived) try again later.
4. **Already linked** conflicts: enforced by 1:1 uniqueness at seed time (ops error); not an end-user rebind flow.

Do not collapse all failures into one message when the recovery action differs (reopen vs wait vs contact ops).

## Considered options

- **Self-serve first link** (email OTP in Mini App, one-time code from web, bot `/start` token) — deferred: correct for multi-user product UX later; unnecessary ceremony and attack surface while ops can seed one (or few) users.
- **Env-only `ALLOWED_TELEGRAM_ID` as sole prod allowlist** — rejected as long-term model: not multi-user-ready; store is source of truth.
- **Silent initData exchange only when Supabase session missing** — rejected for MVP Mini App policy (if revived): **every cold start** re-proves Telegram identity via `initData` then mints session (simpler threat model; accept mint churn / rate limits).
- **Email OTP fallback inside Mini App on fail** — rejected: blurs admin-seed policy and widens in-TG auth surface.
- **Telegram Login Widget / OIDC on web** — non-goal for MVP (research #46 Pattern B poor fit for Mini App; risk of second Auth user).
- **N Telegram identities per one user** — rejected: Telegram user id is stable; 1:1 keeps deny/unlink semantics simple.
- **Force “open in Telegram only” even without `initData` on shared origin** — rejected: same origin must keep browser/PWA email OTP.

## Consequences

- Implementation needs a durable 1:1 mapping + ops seed path before the **bot** can authorize anyone.
- **Current build plan:** ship bot mapping authorize/deny only; do **not** require Mini App session-mint routes for bot Expense capture.
- Bot (and any future Mini App) share one authorization notion: presence in the mapping store.
- Map item “first-time Telegram ↔ Supabase user link UX” (#47) is closed by this ADR; self-serve link/unlink is a later ticket when multi-user onboarding is productized. Surface-roles (#67) narrow **what is implemented first** without discarding the mapping model.

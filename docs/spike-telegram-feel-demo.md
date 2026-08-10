# Telegram bot Expense capture (PRD #69)

Production path: **private-chat Telegram bot** creates **Expenses only** from **photo (Receipt)** and **voice (Recording)**, with **Draft → Commit | Discard fully in chat**, writing to the **same Supabase** data as the **browser/PWA**.

| Surface | Role |
|---------|------|
| **Browser/PWA** | Primary product — History, Month, Categories, manual, Income, email OTP |
| **Telegram bot** | Fast Expense capture only — photo + voice → extract → in-chat confirm |

**Normative sources:** [PRD #69](https://github.com/Globus007/finance-calc/issues/69), [CONTEXT.md](../CONTEXT.md), ADR-0005/0007/0008/0009/0010/0011.

Mini App / WebView session mint is **not** a product deliverable under surface roles (#67). Residual Mini App code may remain gated by the same bot token env; do not treat it as required for bot Expense capture.

---

## What was built

1. **Identity store** — `telegram_user_links` (1:1 `telegram_id` ↔ `auth.users.id`), ops SQL seed only; unmapped → short deny (ADR-0009).
2. **Webhook shell** — `POST /api/telegram/webhook` with `X-Telegram-Bot-Api-Secret-Token`; routes messages + callback queries; private chat only.
3. **Media pipeline** — metadata pre-capture → Bot API download → temp Storage `{user_id}/…` → shared `extractDraft({ path, channel })` → eager delete; channel `photo` \| `voice` only; force **Expense** Draft; photo caption → Note only if extract Note empty (ADR-0011).
4. **Voice** — same hop; product MIME includes **`audio/ogg`** (Telegram voice notes) on bot and PWA.
5. **In-chat confirm** — draft card + inline keyboard: Commit, Discard, Amount / Occurred on / Note (ForceReply), Category (paginated short codes); one Draft per user; 24h idle auto-Discard; Cancel mid-extract; replace on new media (ADR-0010).
6. **Commit** — service-role insert into `public.expenses` for mapped user (same shape as PWA).

---

## Env vars

| Variable | Required for bot | Notes |
|----------|------------------|--------|
| `TELEGRAM_BOT_TOKEN` | yes | BotFather token; server-only |
| `TELEGRAM_WEBHOOK_SECRET` | yes (webhook) | 1–256 chars `[A-Za-z0-9_-]`; same value in `setWebhook` `secret_token` |
| Existing Supabase + site URL | yes | Same as browser app |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Mapping, bot session, Storage upload, Commit |
| `AI_GATEWAY_API_KEY` (or Vercel OIDC) | yes for real extract | Same vision/STT/text models as PWA |

When `TELEGRAM_BOT_TOKEN` is unset, `/api/telegram/*` returns 404/503 and the browser email OTP path is unchanged.

See [`.env.example`](../.env.example).

---

## Ops checklist

### 1. BotFather

1. `/newbot` → save token → `TELEGRAM_BOT_TOKEN`.
2. Optional: `/setcommands` → `start`, `help`, `discard`, `cancel`.

### 2. Public HTTPS

- Prefer Vercel preview/prod URL.
- Local tunnel: `cloudflared tunnel --url http://localhost:3000` / ngrok → HTTPS → `pnpm dev`.

### 3. Database

Apply migration:

```bash
supabase db push
# or run SQL from:
# supabase/migrations/20260810120000_telegram_identity_and_bot_state.sql
```

### 4. Link Telegram identity (ops seed)

1. Numeric Telegram user id (e.g. `@userinfobot`).
2. Supabase Auth user UUID (same account as email OTP).
3. Insert mapping:

```sql
insert into public.telegram_user_links (telegram_id, user_id)
values ('YOUR_TELEGRAM_NUMERIC_ID', 'YOUR_SUPABASE_USER_UUID');
```

1:1 constraints: one `telegram_id` ↔ one `user_id`. Reseed = delete row + insert.

### 5. Webhook

After deploy (or tunnel) with env set:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_ORIGIN/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

Check:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

### 6. Rotate webhook secret

1. Generate new `TELEGRAM_WEBHOOK_SECRET` in env (Vercel + local).
2. Redeploy so the route expects the new value.
3. Call `setWebhook` again with the new `secret_token`.
4. Confirm deliveries succeed (`getWebhookInfo` last error empty).

### 7. Smoke acceptance

- [ ] Ops-seeded user: photo → confirm → Commit → Expense visible in PWA History
- [ ] Same for voice (OGG voice note)
- [ ] Unmapped user: deny; no Storage write
- [ ] Extraction failure → recapture copy; Cancel mid-extract → no Draft
- [ ] Invalid Commit → callback alert; success → card summary only (no monthly/net)
- [ ] No Income / proactive pings required for this surface

### 8. Logging

- Prefer `update_id` in logs; never log bot token, webhook secret, or raw `initData`.
- Webhook returns 2xx after auth so Telegram does not retry forever on handler bugs.

---

## Architecture (lean)

```text
Telegram Bot API (webhook)
  → Next.js route handler
       ├─ secret_token check
       ├─ map telegram_id → user (ADR-0009)
       ├─ download media → temp Storage (user prefix)
       ├─ extractDraft({ path, channel })  // shared with PWA
       ├─ bot Draft state (one in-flight / user)
       └─ Commit → expenses table (owner = mapped user)
PWA
  ├─ email OTP, History, Month, Categories, manual, Income
  └─ same Supabase project
```

---

## Key modules

| Area | Path |
|------|------|
| Webhook | `src/app/api/telegram/webhook/route.ts` |
| Update router | `src/lib/telegram/handle-update.ts` |
| Media adapter | `src/lib/telegram/media-pipeline.ts` |
| Pre-capture | `src/lib/telegram/pre-capture.ts` |
| Draft card / keyboards | `src/lib/telegram/draft-card.ts`, `category-keyboard.ts` |
| Session store | `src/lib/telegram/bot-state.ts` |
| Mapping | `src/lib/telegram/mapping.ts` |
| Shared extract | `src/lib/extract/extract-draft.ts` |

# Deploy finance-calc to Vercel

Production app for personal use. Backend is the same Supabase cloud project used locally.

## Production URL

- **Production:** https://finance-calc-inky.vercel.app  
- **Vercel project:** `globus-projects-634fd0d3/finance-calc`  
- **Git:** `https://github.com/Globus007/finance-calc` (Production Branch: `main`)  
- **Root Directory:** repo root (not `prototype-screen-map`)

## Decisions (summary)

| Topic | Choice |
|-------|--------|
| Goal | Production for personal use |
| Supabase | Same cloud project as local `.env` |
| Domain | Default `*.vercel.app` |
| Pipeline | GitHub → push `main` = Production |
| Preview | Enabled (same DB; caveats below) |
| `NEXT_PUBLIC_SITE_URL` | Production only |
| Extra URL protection | Off — app magic-link auth only |
| AI Gateway | OIDC on Vercel (no `AI_GATEWAY_API_KEY` in prod) |
| Service role | Production + Preview |

## Environment variables

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (sensitive) | yes (sensitive) | no |
| `NEXT_PUBLIC_SITE_URL` | `https://finance-calc-inky.vercel.app` | **omit** (use request Host) | local only |
| `AI_GATEWAY_API_KEY` | omit (OIDC) | omit | local if needed |
| `VISION_MODEL` | optional | optional | optional |

CLI examples (values via stdin / `--value`, never commit secrets):

```bash
pnpm dlx vercel@latest link --project finance-calc -S globus-projects-634fd0d3
printf '%s' "$VALUE" | pnpm dlx vercel@latest env add NAME production,preview --yes
```

## Project settings

- **Framework:** Next.js  
- **Install Command:** `pnpm install --no-frozen-lockfile`  
  - Workaround for `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (`pnpmfileChecksum`) between local pnpm 11 lockfile and frozen install on Vercel. Prefer fixing the lockfile/checksum long-term; until then keep this install command.  
- **Build Command:** default (`pnpm run build` / `next build`)  
- **Node:** 24.x  

## Secrets hygiene

- Do **not** upload local `.env` / `.env.local` to Vercel.  
- Repo has `.vercelignore` blocking `.env` and `prototype-screen-map`.  
- Prefer Vercel project env only (as in the table).  
- **Note:** the first successful CLI deploy briefly included a local `.env` in the build context. After `.vercelignore`, redeployed without it. If that window is a concern, **rotate** `SUPABASE_SERVICE_ROLE_KEY` in Supabase and update Vercel env.

## Supabase Auth URL configuration

**Required for production login.** If Site URL stays `http://localhost:3000` and production is not on the Redirect allow list, Supabase ignores `emailRedirectTo` from the app and magic links land on localhost.

Dashboard → **Authentication** → **URL Configuration**  
(direct: `https://supabase.com/dashboard/project/<project-ref>/auth/url-configuration`)

1. **Site URL:** `https://finance-calc-inky.vercel.app`
2. **Redirect URLs** allow list (include all you use):
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/confirm`
   - `https://finance-calc-inky.vercel.app/**`
   - `https://finance-calc-inky.vercel.app/auth/confirm`
   - `https://*.vercel.app/**` (Preview magic links)
3. Keep email Magic Link provider enabled; single-user app uses `shouldCreateUser: false` (pre-create the user).

App-side: `resolvePublicOrigin` prefers the non-local request host / Vercel URL over a localhost `NEXT_PUBLIC_SITE_URL` so a mis-set local env cannot force prod magic links to localhost. Supabase allowlist still must accept the prod origin.

## Deploy flows

### Automatic (preferred)

1. Push to `main` on GitHub.  
2. Vercel builds Production and aliases `https://finance-calc-inky.vercel.app`.  
3. PR branches get Preview deployments (same Supabase data).

### Manual CLI

```bash
pnpm dlx vercel@latest deploy --prod --yes -S globus-projects-634fd0d3
```

## PWA (install + capture constraints)

Production is **HTTPS** on Vercel — required for camera/mic (`getUserMedia` is secure-context only). No service worker and **no offline capture queue** (online-first MVP).

| Item | Notes |
|------|--------|
| Manifest | `/manifest.webmanifest` via `src/app/manifest.ts` (`display: standalone`, `start_url: /`) |
| Icons | `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` |
| Install | Mobile Safari / Chrome: Add to Home Screen / Install app |
| Auth in installed PWA | **Primary:** 6-digit email OTP entered **in the PWA** (same cookie jar). Magic link is secondary — opening email in Safari does not share cookies with the home-screen app. |
| Capture pre-errors | Offline before upload, permission denied, insecure context → inline shell messages (ADR-0008), not silent fail |

Supabase Auth email template should expose the **OTP token** (`{{ .Token }}`) so users can type the code on `/login`. Link (`{{ .ConfirmationURL }}`) can remain for desktop/browser secondary path.

## Smoke checklist (definition of done)

On `https://finance-calc-inky.vercel.app`:

1. Open `/` → redirect to `/login`  
2. Request OTP → email → enter **6-digit code in the app** → session cookie → `/`  
3. (Optional secondary) Open magic link in the **same** browser → `/auth/confirm` → `/`  
4. Home / Month / History load for the signed-in user  
5. Manual expense: draft → commit appears in History / monthly total  
6. Photo / voice capture → extract → confirm → commit (HTTPS + permissions)  
7. Install to home screen → reopen → still authenticated (cookie session)  
8. Logout  

Automated HTTP checks (no auth):

- `GET /` → 307 → `/login`  
- `GET /login` → 200  
- `GET /manifest.webmanifest` → 200 (JSON name/icons/`start_url`)  
- `GET /month` (unauthenticated) → ends on `/login`

## Preview caveats

- Preview shares the **same** Supabase project (data + Storage + service role).  
- Do not set `NEXT_PUBLIC_SITE_URL` on Preview; `getPublicOrigin()` uses `x-forwarded-host`.  
- Ensure Supabase Redirect allowlist includes `https://*.vercel.app/**`.  
- Vercel Deployment Protection may still apply to non-custom domains for some team settings; Production app routes are reachable with app-level auth only.

## Out of scope

- Custom domain  
- Separate prod Supabase project  
- Deploying `prototype-screen-map`  
- Vercel Password / SSO in front of the app  

## Related local files

- `.env.example` — variable names and Auth notes  
- `.vercelignore` — block secrets + prototype from CLI uploads  
- `src/lib/auth/site-url.ts` — `NEXT_PUBLIC_SITE_URL` / Host fallback  

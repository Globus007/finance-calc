# finance-calc

Personal finance capture for a single user: record **expenses** and **income** in **BYN**, confirm drafts, manage categories, and see monthly totals.

Capture channels:

| Channel | Expense | Income |
|---------|---------|--------|
| Photo (receipt) | yes | — |
| Voice | yes | yes |
| Manual | yes | yes |

Media (photo / recording) is ephemeral: after extraction, only draft fields remain for confirm. Commit creates exactly one expense or income; discard abandons the draft without saving.

## Features

- **Capture → Draft → Commit** flow with the same confirm field set across channels
- **Categories** for expenses (seed + user-defined; hide / unhide / rename rules)
- **History** of committed expenses and incomes (edit / delete)
- **Monthly totals** (expense total, income total, net) for calendar months in `Europe/Minsk`
- **Auth**: email + 6-digit OTP (magic link secondary)
- **PWA-oriented** UI (installable; camera/mic need HTTPS)

Domain vocabulary and constraints live in [`CONTEXT.md`](./CONTEXT.md). Architectural decisions are in [`docs/adr/`](./docs/adr/).

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Supabase](https://supabase.com/) (Postgres, Auth, Storage, RLS)
- [Vercel AI SDK](https://sdk.vercel.ai/) + AI Gateway (vision extract, STT, text extract)
- [Vitest](https://vitest.dev/) + Testing Library
- [Honeybadger](https://www.honeybadger.io/) (optional error tracking)

## Prerequisites

- Node.js 24+ recommended (matches production)
- [pnpm](https://pnpm.io/) 11 (`packageManager` field in `package.json`)
- A Supabase project with migrations applied (`supabase/migrations/`)
- Vercel AI Gateway access for photo/voice extraction (API key locally; OIDC on Vercel)

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill values from Supabase Dashboard → Project Settings → API
```

Required env vars (see [`.env.example`](./.env.example) for the full list and auth notes):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin / storage cleanup |
| `NEXT_PUBLIC_SITE_URL` | Public origin for auth redirects (required in production) |
| `AI_GATEWAY_API_KEY` | Local AI Gateway access (omit on Vercel if using OIDC) |

Optional: model overrides (`VISION_MODEL`, `STT_MODEL`, `TEXT_EXTRACT_MODEL`), Honeybadger keys.

**Supabase Auth** (Dashboard → Authentication → URL Configuration): set Site URL and Redirect URLs for local and production origins. The app is single-user (`shouldCreateUser: false`) — create the user in the dashboard first. Seed categories are applied via DB triggers after user insert (see migrations and ADRs).

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (once) |
| `pnpm test:watch` | Vitest watch mode |

## Project layout

```
src/
  app/                 # Routes: login, capture, history, month, categories, auth
  components/          # UI (capture flow, history, categories, shell)
  lib/                 # Domain helpers, extract pipelines, Supabase clients, money/dates
supabase/
  migrations/          # Schema, RLS, seed categories, capture-temp storage
  tests/               # SQL tests for schema / storage / category rules
docs/
  adr/                 # Architecture decision records
  deploy-vercel.md     # Production deploy checklist
prototype-screen-map/  # Throwaway UI prototype (not part of production app)
```

## Deploy

Production deploys from `main` via Vercel. Details (env matrix, Auth URL config, PWA notes):

→ [`docs/deploy-vercel.md`](./docs/deploy-vercel.md)

## Agent / contributor docs

- [`AGENTS.md`](./AGENTS.md) — agent entrypoint
- [`CONTEXT.md`](./CONTEXT.md) — domain model (ubiquitous language)
- [`docs/adr/`](./docs/adr/) — decision records
- [`docs/agents/`](./docs/agents/) — issue tracker, triage labels, domain skill config

## License

Private project (`"private": true` in `package.json`). Not published as an open-source package.

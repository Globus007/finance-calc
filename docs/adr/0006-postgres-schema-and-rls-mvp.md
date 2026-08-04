# Postgres schema and RLS for single-user MVP

MVP persists only **committed** domain data in Postgres: **categories**, **expenses**, **incomes**. **Draft** is client-only in-flight state (Commit | Discard)—no `drafts` table. **Monthly total** is live `SUM` on read—no totals table. **Receipt** / **Recording** stay in ephemeral Storage (ADR-0005), not DB rows. Every user table is scoped by `owner_id` with RLS `owner_id = auth.uid()`; seed Categories are **copied per user** on `auth.users` insert (security definer trigger).

## Tables (shape)

### `categories`

| Column | Notes |
|--------|--------|
| `id` | `uuid` PK, `gen_random_uuid()` |
| `owner_id` | `uuid` NOT NULL → `auth.users(id)` **ON DELETE CASCADE** |
| `display_name` | text; unique per owner case-insensitive (`UNIQUE (owner_id, lower(display_name))`) |
| `origin` | `seed` \| `user` |
| `is_system_fallback` | bool; only «Прочее» seed |
| `is_hidden` | bool; Hide / Unhide |
| `sort_order` | int; fixed seed list order (ADR-0001); user-defined ignored for A–Я sort in app |
| `seed_key` | stable slug for seed rows (idempotent trigger); null for user-defined |
| `created_at` | `timestamptz` |

- One concept for seed and user-defined (origin is a property).
- Hard-delete user-defined only when no Expense references them (`expenses.category_id` **ON DELETE RESTRICT**).
- Seed rename/delete and system-fallback hide/delete: **app-enforced** lifecycle (ADR-0001); DB holds integrity (uniqueness, FK) and owner isolation, not full seed policy matrix.

### `expenses`

| Column | Notes |
|--------|--------|
| `id` | `uuid` PK |
| `owner_id` | → `auth.users` CASCADE |
| `amount` | `numeric(12,2)` CHECK `> 0` (BYN; no currency column) |
| `occurred_on` | `date` (calendar day; product TZ Europe/Minsk is app-side, ADR-0004) |
| `category_id` | uuid NOT NULL |
| `note` | nullable text; app max ~500; empty → NULL |
| `channel` | text CHECK `IN ('photo','voice','manual')` |
| `created_at` / `updated_at` | `timestamptz` (Commit time vs Edit; not Occurred on) |

- **Composite FK** `(owner_id, category_id)` → `categories (owner_id, id)` so Category cannot cross owners.
- **Hard DELETE** on user Delete (domain Delete = remove entirely).
- **Channel immutable after Commit** (app): Edit may change Amount, Occurred on, Category, Note only; kind Expense/Income immutable (no cross-table type switch).

### `incomes`

Same money/date/note/timestamps/owner pattern as expenses; **no** `category_id`.

| Extra | Notes |
|-------|--------|
| `channel` | text CHECK `IN ('voice','manual')` — photo forbidden |

### Explicitly absent

- `drafts` / deferred incomplete drafts  
- `monthly_totals` (or snapshots)  
- media / receipt / recording tables  
- unified `transactions` / polymorphic ledger  
- `currency` column (always BYN)

## Indexes

- `expenses (owner_id, occurred_on DESC)`  
- `incomes (owner_id, occurred_on DESC)`  
- Category list/picker via `owner_id`; unique name index as above  
- Supporting unique on `categories (id, owner_id)` (or equivalent) for the composite FK target  

History = app `UNION ALL` expenses + incomes ordered by `occurred_on` (and `created_at` as tie-break if needed).

## RLS and access

- Enable RLS on all three tables.
- Policies: SELECT / INSERT / UPDATE / DELETE where `owner_id = auth.uid()` (WITH CHECK same on write).
- Reads/writes use **user JWT** (browser or `@supabase/ssr` server client)—not service role for ordinary CRUD.
- **Service role / security definer**: seed trigger on signup; Storage read/delete + extract path (ADR-0005).
- Seed integrity flags (`origin`, `is_system_fallback`, `seed_key`): **trust app** in MVP (no extra RLS forbidding client seed inserts); revisit if clients become adversarial.

## Seed onboarding

`AFTER INSERT ON auth.users` → security definer function inserts the 13 seed Categories (ADR-0001 names + `seed_key` + `sort_order` + system fallback on «Прочее») for `NEW.id`. Guarantees Category set before first Commit without a client seed call.

## Considered options

- **Persist Draft in Postgres (or hybrid extract cache as domain Draft)** — rejected: ADR-0003 in-flight only; client state avoids orphans and a deferred-draft product surface.
- **Single `records` table + `kind`** — rejected: Expense requires Category, Income must not; two tables match first-class domain types and constraints.
- **Global seed catalog + per-user overrides** — rejected: per-user seed copies keep RLS and uniqueness one-dimensional (`owner_id`).
- **integer minor units / float amounts** — rejected: `numeric(12,2)` fits BYN; floats unsafe.
- **Soft-delete committed rows** — rejected: domain Delete is hard remove; live totals stay simple.
- **Materialized monthly totals** — rejected: personal volume; live SUM matches ADR-0004.
- **Service-role-only mutations** — rejected: user-session + RLS aligns with Supabase SSR auth (#11) and least privilege for CRUD.
- **App-only category ownership (no composite FK)** — rejected: FK bypass via guessed UUID is a real integrity hole.
- **Postgres ENUM for channel** — rejected: text + CHECK is enough and easier to migrate.
- **Seed on first login / lazy picker** — rejected: trigger avoids race before first Expense.
- **Editable Channel after Commit** — rejected: Channel is capture provenance (CONTEXT.md), not a user label.
- **DB triggers for full Category lifecycle matrix** — deferred: app + uniqueness/FK first; optional later hardening.

## Consequences

- Map item “Postgres schema / RLS details” → closed by this ADR + implementation migrations.
- LLM extract / confirm UI never round-trip Draft through Postgres.
- Month bounds and “today” stay in app (Europe/Minsk); DB stores bare `date`.
- Migrations should create seed function + trigger before production signups.

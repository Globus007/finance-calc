-- Telegram bot Expense capture (PRD #69): durable identity link + bot in-flight state.
-- ADR-0009 (mapping store), ADR-0010 (one open Draft per mapped user for bot).

-- ---------------------------------------------------------------------------
-- telegram_user_links: 1:1 telegram_id ↔ auth.users (ops seed only)
-- ---------------------------------------------------------------------------
create table public.telegram_user_links (
  telegram_id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index telegram_user_links_user_id_idx
  on public.telegram_user_links (user_id);

comment on table public.telegram_user_links is
  'ADR-0009: durable 1:1 Telegram user id → Supabase auth user. Ops seed only.';

alter table public.telegram_user_links enable row level security;

-- No authenticated policies: browser clients never read/write links.
-- Service role bypasses RLS for bot authorize/deny.

grant all on public.telegram_user_links to service_role;

-- ---------------------------------------------------------------------------
-- telegram_bot_sessions: one in-flight bot Draft / extract job per mapped user
-- ---------------------------------------------------------------------------
create table public.telegram_bot_sessions (
  telegram_id text primary key
    references public.telegram_user_links (telegram_id) on delete cascade,
  phase text not null
    check (phase in (
      'idle',
      'extracting',
      'confirm',
      'awaiting_amount',
      'awaiting_occurred_on',
      'awaiting_note'
    )),
  draft jsonb,
  card_chat_id bigint,
  card_message_id integer,
  progress_message_id integer,
  category_page integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.telegram_bot_sessions is
  'ADR-0010: app-owned bot confirm/extract state (one Draft per mapped telegram_id).';

alter table public.telegram_bot_sessions enable row level security;

grant all on public.telegram_bot_sessions to service_role;

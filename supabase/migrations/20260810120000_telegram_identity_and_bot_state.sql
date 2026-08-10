-- Telegram bot Expense capture (PRD #69): durable identity link + bot in-flight
-- state and concurrency RPCs.
-- ADR-0009 (mapping store), ADR-0008 (Commit fail restore), ADR-0010 (one open
-- Draft / extract job per mapped user for bot).

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
  -- Opaque token for the in-flight extract job; null when not extracting.
  extract_job_id text,
  -- Opaque generation set by Commit claim; restore requires match; null otherwise.
  commit_claim_id text,
  updated_at timestamptz not null default now()
);

comment on table public.telegram_bot_sessions is
  'ADR-0010: app-owned bot confirm/extract state (one Draft per mapped telegram_id).';

comment on column public.telegram_bot_sessions.extract_job_id is
  'ADR-0010: opaque token for the in-flight extract job; null when not extracting.';

comment on column public.telegram_bot_sessions.commit_claim_id is
  'ADR-0008/0010: opaque token set by Commit claim; restore requires match; null when not a post-claim idle awaiting restore.';

alter table public.telegram_bot_sessions enable row level security;

grant all on public.telegram_bot_sessions to service_role;

-- ---------------------------------------------------------------------------
-- claim_telegram_bot_session_for_commit
-- Atomic claim of an open bot Draft for Commit or Discard.
-- Two concurrent CB_COMMIT handlers must not both insert an expense (ADR-0010:
-- one prospective Expense per Draft). SELECT … FOR UPDATE serialises claimers;
-- the loser finds no open Draft and returns null.
--
-- Clears the row to idle and stamps commit_claim_id so a failed Commit can
-- restore only that generation. A later extract that claims (and even clears
-- back to idle) supersedes the token and cannot be overwritten by restore.
-- ---------------------------------------------------------------------------
create or replace function public.claim_telegram_bot_session_for_commit(
  p_telegram_id text,
  p_card_message_id integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.telegram_bot_sessions%rowtype;
  v_claim_id text;
begin
  select *
    into claimed
  from public.telegram_bot_sessions
  where telegram_id = p_telegram_id
    and card_message_id = p_card_message_id
    and draft is not null
    and phase in (
      'confirm',
      'awaiting_amount',
      'awaiting_occurred_on',
      'awaiting_note'
    )
  for update;

  if not found then
    return null;
  end if;

  v_claim_id := gen_random_uuid()::text;

  update public.telegram_bot_sessions
  set
    phase = 'idle',
    draft = null,
    card_chat_id = null,
    card_message_id = null,
    progress_message_id = null,
    category_page = 0,
    extract_job_id = null,
    commit_claim_id = v_claim_id,
    updated_at = now()
  where telegram_id = p_telegram_id;

  return jsonb_build_object(
    'telegram_id', claimed.telegram_id,
    'phase', claimed.phase,
    'draft', claimed.draft,
    'card_chat_id', claimed.card_chat_id,
    'card_message_id', claimed.card_message_id,
    'progress_message_id', claimed.progress_message_id,
    'category_page', claimed.category_page,
    'extract_job_id', claimed.extract_job_id,
    -- Post-claim generation (not the pre-claim null); required for restore.
    'commit_claim_id', v_claim_id,
    'updated_at', claimed.updated_at
  );
end;
$$;

revoke all on function public.claim_telegram_bot_session_for_commit(text, integer)
  from public;
grant execute on function public.claim_telegram_bot_session_for_commit(text, integer)
  to service_role;

comment on function public.claim_telegram_bot_session_for_commit(text, integer) is
  'ADR-0010: exclusive claim of open bot Draft for Commit/Discard; returns snapshot + commit_claim_id; concurrent loser gets null.';

-- ---------------------------------------------------------------------------
-- restore_telegram_bot_session_after_failed_commit
-- Re-open the Draft after Commit persist failure only for this claim generation
-- (idle + matching commit_claim_id). Idle shape alone is not enough: a newer
-- media extract can claim the freed session, fail, and clear back to the same
-- idle shape — that must not resurrect the superseded Draft.
-- ---------------------------------------------------------------------------
create or replace function public.restore_telegram_bot_session_after_failed_commit(
  p_telegram_id text,
  p_phase text,
  p_draft jsonb,
  p_card_chat_id bigint,
  p_card_message_id integer,
  p_progress_message_id integer,
  p_category_page integer,
  p_commit_claim_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_draft is null then
    raise exception 'draft required';
  end if;
  if p_commit_claim_id is null or length(btrim(p_commit_claim_id)) = 0 then
    raise exception 'commit_claim_id required';
  end if;
  if p_phase is null or p_phase not in (
    'confirm',
    'awaiting_amount',
    'awaiting_occurred_on',
    'awaiting_note'
  ) then
    raise exception 'invalid restore phase';
  end if;

  update public.telegram_bot_sessions
  set
    phase = p_phase,
    draft = p_draft,
    card_chat_id = p_card_chat_id,
    card_message_id = p_card_message_id,
    progress_message_id = p_progress_message_id,
    category_page = coalesce(p_category_page, 0),
    extract_job_id = null,
    commit_claim_id = null,
    updated_at = now()
  where telegram_id = p_telegram_id
    and phase = 'idle'
    and draft is null
    and extract_job_id is null
    and card_message_id is null
    and commit_claim_id = p_commit_claim_id;

  return found;
end;
$$;

revoke all on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer, text
) from public;
grant execute on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer, text
) to service_role;

comment on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer, text
) is
  'ADR-0008/0010: restore open Draft after failed Commit only if commit_claim_id still matches post-claim idle (no newer generation).';

-- ---------------------------------------------------------------------------
-- claim_telegram_bot_session_for_extract
-- Exclusive start of extract: loser (already extracting) gets null.
-- Returns { previous: session | null } so the caller can edit an open Draft card.
-- Clears any pending Commit restore token (commit_claim_id).
-- ---------------------------------------------------------------------------
create or replace function public.claim_telegram_bot_session_for_extract(
  p_telegram_id text,
  p_extract_job_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous public.telegram_bot_sessions%rowtype;
  has_previous boolean;
begin
  if p_extract_job_id is null or length(btrim(p_extract_job_id)) = 0 then
    raise exception 'extract_job_id required';
  end if;

  select *
    into previous
  from public.telegram_bot_sessions
  where telegram_id = p_telegram_id
  for update;

  has_previous := found;

  if has_previous and previous.phase = 'extracting' then
    return null;
  end if;

  if has_previous then
    update public.telegram_bot_sessions
    set
      phase = 'extracting',
      draft = null,
      card_chat_id = null,
      card_message_id = null,
      progress_message_id = null,
      category_page = 0,
      extract_job_id = p_extract_job_id,
      commit_claim_id = null,
      updated_at = now()
    where telegram_id = p_telegram_id;
  else
    begin
      insert into public.telegram_bot_sessions (
        telegram_id,
        phase,
        draft,
        card_chat_id,
        card_message_id,
        progress_message_id,
        category_page,
        extract_job_id,
        commit_claim_id,
        updated_at
      ) values (
        p_telegram_id,
        'extracting',
        null,
        null,
        null,
        null,
        0,
        p_extract_job_id,
        null,
        now()
      );
    exception
      when unique_violation then
        -- Concurrent first-row insert won the race.
        return null;
    end;
  end if;

  if not has_previous then
    return jsonb_build_object('previous', null);
  end if;

  return jsonb_build_object(
    'previous', jsonb_build_object(
      'telegram_id', previous.telegram_id,
      'phase', previous.phase,
      'draft', previous.draft,
      'card_chat_id', previous.card_chat_id,
      'card_message_id', previous.card_message_id,
      'progress_message_id', previous.progress_message_id,
      'category_page', previous.category_page,
      'extract_job_id', previous.extract_job_id,
      'commit_claim_id', previous.commit_claim_id,
      'updated_at', previous.updated_at
    )
  );
end;
$$;

revoke all on function public.claim_telegram_bot_session_for_extract(text, text)
  from public;
grant execute on function public.claim_telegram_bot_session_for_extract(text, text)
  to service_role;

comment on function public.claim_telegram_bot_session_for_extract(text, text) is
  'ADR-0010: exclusive claim to start extract; concurrent loser gets null.';

-- ---------------------------------------------------------------------------
-- complete_telegram_bot_session_extract
-- Promote extract → confirm only while this job still owns the session.
-- ---------------------------------------------------------------------------
create or replace function public.complete_telegram_bot_session_extract(
  p_telegram_id text,
  p_extract_job_id text,
  p_draft jsonb,
  p_card_chat_id bigint,
  p_card_message_id integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_extract_job_id is null or length(btrim(p_extract_job_id)) = 0 then
    raise exception 'extract_job_id required';
  end if;
  if p_draft is null then
    raise exception 'draft required';
  end if;

  update public.telegram_bot_sessions
  set
    phase = 'confirm',
    draft = p_draft,
    card_chat_id = p_card_chat_id,
    card_message_id = p_card_message_id,
    progress_message_id = null,
    category_page = 0,
    extract_job_id = null,
    commit_claim_id = null,
    updated_at = now()
  where telegram_id = p_telegram_id
    and phase = 'extracting'
    and extract_job_id = p_extract_job_id;

  return found;
end;
$$;

revoke all on function public.complete_telegram_bot_session_extract(
  text, text, jsonb, bigint, integer
) from public;
grant execute on function public.complete_telegram_bot_session_extract(
  text, text, jsonb, bigint, integer
) to service_role;

comment on function public.complete_telegram_bot_session_extract(
  text, text, jsonb, bigint, integer
) is
  'ADR-0010: conditional extract→confirm; false if job no longer owns the session.';

-- ---------------------------------------------------------------------------
-- clear_telegram_bot_session_extract
-- Clear extracting session only for this job (failures / cancel path).
-- ---------------------------------------------------------------------------
create or replace function public.clear_telegram_bot_session_extract(
  p_telegram_id text,
  p_extract_job_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_extract_job_id is null or length(btrim(p_extract_job_id)) = 0 then
    raise exception 'extract_job_id required';
  end if;

  update public.telegram_bot_sessions
  set
    phase = 'idle',
    draft = null,
    card_chat_id = null,
    card_message_id = null,
    progress_message_id = null,
    category_page = 0,
    extract_job_id = null,
    commit_claim_id = null,
    updated_at = now()
  where telegram_id = p_telegram_id
    and phase = 'extracting'
    and extract_job_id = p_extract_job_id;

  return found;
end;
$$;

revoke all on function public.clear_telegram_bot_session_extract(text, text)
  from public;
grant execute on function public.clear_telegram_bot_session_extract(text, text)
  to service_role;

comment on function public.clear_telegram_bot_session_extract(text, text) is
  'ADR-0010: clear extract job only if extract_job_id still matches.';

-- Per-extract job token (ADR-0010) so concurrent media webhooks cannot both
-- finish as the active extract. Only the job that owns extract_job_id may
-- cancel-check, clear, or promote to confirm.

alter table public.telegram_bot_sessions
  add column if not exists extract_job_id text;

comment on column public.telegram_bot_sessions.extract_job_id is
  'ADR-0010: opaque token for the in-flight extract job; null when not extracting.';

-- Keep Commit claim clearing the new column.
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

  update public.telegram_bot_sessions
  set
    phase = 'idle',
    draft = null,
    card_chat_id = null,
    card_message_id = null,
    progress_message_id = null,
    category_page = 0,
    extract_job_id = null,
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
    'updated_at', claimed.updated_at
  );
end;
$$;

-- Exclusive start of extract: loser (already extracting) gets null.
-- Returns { previous: session | null } so the caller can edit an open Draft card.
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

-- Promote extract → confirm only while this job still owns the session.
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

-- Clear extracting session only for this job (failures / cancel path).
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

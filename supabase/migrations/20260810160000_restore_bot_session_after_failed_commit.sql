-- Conditional restore after Commit persist failure (ADR-0008 / ADR-0010).
-- claim_telegram_bot_session_for_commit clears the row to idle so concurrent
-- Commit cannot double-insert. While Commit awaits the DB, new media may
-- claim the freed session for extract. Unconditional upsert would then
-- overwrite the new extractJobId / Draft — cancel the new job and discard
-- its result. Restore only when the row is still the empty idle post-claim
-- state.

create or replace function public.restore_telegram_bot_session_after_failed_commit(
  p_telegram_id text,
  p_phase text,
  p_draft jsonb,
  p_card_chat_id bigint,
  p_card_message_id integer,
  p_progress_message_id integer,
  p_category_page integer
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
    updated_at = now()
  where telegram_id = p_telegram_id
    and phase = 'idle'
    and draft is null
    and extract_job_id is null
    and card_message_id is null;

  return found;
end;
$$;

revoke all on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer
) from public;
grant execute on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer
) to service_role;

comment on function public.restore_telegram_bot_session_after_failed_commit(
  text, text, jsonb, bigint, integer, integer, integer
) is
  'ADR-0008/0010: restore open Draft after failed Commit only if session still idle post-claim (no newer extract/Draft).';

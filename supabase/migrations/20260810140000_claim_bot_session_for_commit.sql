-- Atomic claim of an open bot Draft for Commit.
-- Two concurrent CB_COMMIT handlers must not both insert an expense (ADR-0010:
-- one prospective Expense per Draft). SELECT … FOR UPDATE serialises claimers;
-- the loser finds no open Draft and returns null.

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
    'updated_at', claimed.updated_at
  );
end;
$$;

revoke all on function public.claim_telegram_bot_session_for_commit(text, integer)
  from public;
grant execute on function public.claim_telegram_bot_session_for_commit(text, integer)
  to service_role;

comment on function public.claim_telegram_bot_session_for_commit(text, integer) is
  'ADR-0010: exclusive claim of open bot Draft for Commit; concurrent loser gets null.';

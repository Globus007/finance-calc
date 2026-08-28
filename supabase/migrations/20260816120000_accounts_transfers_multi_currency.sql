-- Accounts as first-class named tills (one fixed Currency each), per-Account
-- Opening + FX state, and Transfers between own Accounts.
-- Spec: ADR-0014, issue #85. Canonical BYN storage is preserved (ADR-0013).

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  currency text not null check (currency in ('BYN', 'USD', 'EUR')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accounts is
  'Named tills, one Currency each (BYN | USD | EUR), fixed at creation. Every Expense/Income/Opening/Transfer endpoint belongs to one Account.';

-- At most one default Account per owner (the routing target of fast capture).
create unique index accounts_one_default_per_owner_uidx
  on public.accounts (owner_id)
  where is_default;

-- Composite FK target for expenses / incomes / openings / transfers.
create unique index accounts_owner_id_id_uidx
  on public.accounts (owner_id, id);

create index accounts_owner_id_idx on public.accounts (owner_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();

-- Currency never changes after creation (ADR-0014): re-labelling a Currency
-- would silently rewrite the meaning of every record already in the till.
create or replace function public.accounts_keep_currency()
returns trigger
language plpgsql
as $$
begin
  if new.currency is distinct from old.currency then
    raise exception 'account_currency_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger accounts_currency_immutable
  before update on public.accounts
  for each row
  execute function public.accounts_keep_currency();

-- The first Account of an owner is always the default; while an owner has a
-- single Account it stays the default (there is nothing else to route to).
create or replace function public.accounts_keep_first_default()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.accounts a where a.owner_id = new.owner_id) then
      new.is_default := true;
    end if;
    return new;
  end if;

  if (select count(*) from public.accounts a where a.owner_id = new.owner_id) = 1 then
    new.is_default := true;
  end if;
  return new;
end;
$$;

create trigger accounts_first_default_insert
  before insert on public.accounts
  for each row
  execute function public.accounts_keep_first_default();

create trigger accounts_first_default_update
  before update on public.accounts
  for each row
  execute function public.accounts_keep_first_default();

-- At least one Account always exists. "Delete only when empty" comes from the
-- `on delete restrict` FKs of expenses / incomes / openings / transfers.
create or replace function public.accounts_keep_last()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.accounts a where a.owner_id = old.owner_id) = 1 then
    raise exception 'last_account' using errcode = '23514';
  end if;
  return old;
end;
$$;

create trigger accounts_keep_last
  before delete on public.accounts
  for each row
  execute function public.accounts_keep_last();

-- Deleting the default Account promotes the oldest remaining one, so the
-- owner is never left without a fast-capture target.
create or replace function public.accounts_promote_default_after_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_default
     and not exists (select 1 from public.accounts a where a.owner_id = old.owner_id and a.is_default)
  then
    update public.accounts
      set is_default = true
      where id = (
        select a.id from public.accounts a
        where a.owner_id = old.owner_id
        order by a.created_at, a.id
        limit 1
      );
  end if;
  return old;
end;
$$;

create trigger accounts_promote_default_after_delete
  after delete on public.accounts
  for each row
  execute function public.accounts_promote_default_after_delete();

-- ---------------------------------------------------------------------------
-- default Account on signup (same pattern as seed_categories_for_user)
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_account_for_user(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (owner_id, name, currency, is_default)
  values (p_owner_id, 'Наличные', 'BYN', true)
  on conflict (owner_id) where is_default do nothing;
end;
$$;

comment on function public.seed_default_account_for_user(uuid) is
  'Creates the default «Наличные» (BYN) Account for a user. Idempotent.';

create or replace function public.handle_new_user_seed_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_account_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_account on auth.users;

create trigger on_auth_user_created_seed_account
  after insert on auth.users
  for each row
  execute function public.handle_new_user_seed_account();

-- ---------------------------------------------------------------------------
-- RLS + privileges: accounts
-- ---------------------------------------------------------------------------
alter table public.accounts enable row level security;

create policy accounts_select_own
  on public.accounts for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy accounts_insert_own
  on public.accounts for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy accounts_update_own
  on public.accounts for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy accounts_delete_own
  on public.accounts for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.accounts to authenticated;
grant all on public.accounts to service_role;

revoke all on function public.seed_default_account_for_user(uuid) from public;
revoke all on function public.handle_new_user_seed_account() from public;
grant execute on function public.seed_default_account_for_user(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- expenses / incomes: Account membership + EUR
-- ---------------------------------------------------------------------------
alter table public.expenses add column account_id uuid;
alter table public.incomes add column account_id uuid;

alter table public.expenses
  add constraint expenses_account_owner_fk
  foreign key (owner_id, account_id)
  references public.accounts (owner_id, id)
  on delete restrict;

alter table public.incomes
  add constraint incomes_account_owner_fk
  foreign key (owner_id, account_id)
  references public.accounts (owner_id, id)
  on delete restrict;

create index expenses_owner_account_occurred_on_idx
  on public.expenses (owner_id, account_id, occurred_on desc);

create index incomes_owner_account_occurred_on_idx
  on public.incomes (owner_id, account_id, occurred_on desc);

-- Currency now follows the Account: BYN | USD | EUR. The snapshot pair is
-- required for every non-BYN row (per-Account figures are exact in native).
alter table public.expenses
  drop constraint expenses_currency_check,
  drop constraint expenses_usd_snapshot_pair,
  add constraint expenses_currency_check
    check (currency in ('BYN', 'USD', 'EUR')),
  add constraint expenses_snapshot_pair
    check (
      (currency = 'BYN' and original_amount is null and fx_rate is null)
      or
      (currency <> 'BYN' and original_amount is not null and fx_rate is not null)
    );

alter table public.incomes
  drop constraint incomes_currency_check,
  drop constraint incomes_usd_snapshot_pair,
  add constraint incomes_currency_check
    check (currency in ('BYN', 'USD', 'EUR')),
  add constraint incomes_snapshot_pair
    check (
      (currency = 'BYN' and original_amount is null and fx_rate is null)
      or
      (currency <> 'BYN' and original_amount is not null and fx_rate is not null)
    );

comment on column public.expenses.currency is
  'Currency of the record''s Account (BYN | USD | EUR). Canonical amount stays BYN.';

-- ---------------------------------------------------------------------------
-- One-time migration: existing single-till data moves to «Наличные» (BYN).
-- ---------------------------------------------------------------------------
insert into public.accounts (owner_id, name, currency, is_default)
select u.id, 'Наличные', 'BYN', true
  from auth.users u
on conflict (owner_id) where is_default do nothing;

update public.expenses e
   set account_id = a.id
  from public.accounts a
 where a.owner_id = e.owner_id and a.is_default;

update public.incomes i
   set account_id = a.id
  from public.accounts a
 where a.owner_id = i.owner_id and a.is_default;

alter table public.expenses
  alter column account_id set not null;

alter table public.incomes
  alter column account_id set not null;

-- ---------------------------------------------------------------------------
-- openings: one Opening per Account, amount in that Account's Currency
-- ---------------------------------------------------------------------------
alter table public.openings add column account_id uuid;

update public.openings o
   set account_id = a.id
  from public.accounts a
 where a.owner_id = o.owner_id and a.is_default;

alter table public.openings
  alter column account_id set not null;

alter table public.openings drop constraint openings_pkey;

alter table public.openings
  add constraint openings_pkey primary key (owner_id, account_id);

alter table public.openings
  add constraint openings_account_owner_fk
  foreign key (owner_id, account_id)
  references public.accounts (owner_id, id)
  on delete cascade;

comment on table public.openings is
  'One Opening per (owner, Account): amount in the Account Currency + calendar date. Remainder is computed on read. Cascades with its Account: an empty till has no Opening.';

-- ---------------------------------------------------------------------------
-- fx_rates: per-Currency state rows (USD and EUR), same cache + override shape
-- ---------------------------------------------------------------------------
alter table public.fx_rates
  add column currency text not null default 'USD'
    check (currency in ('USD', 'EUR'));

alter table public.fx_rates drop constraint fx_rates_pkey;

alter table public.fx_rates
  add constraint fx_rates_pkey primary key (owner_id, currency);

create index fx_rates_owner_id_idx on public.fx_rates (owner_id);

comment on table public.fx_rates is
  'Per-user, per-Currency effective rate (USD→BYN, EUR→BYN): lazy NBRB daily cache + optional manual override (ADR-0013 / ADR-0014). No rate history.';

-- ---------------------------------------------------------------------------
-- transfers
-- ---------------------------------------------------------------------------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_account_id uuid not null,
  target_account_id uuid not null,
  -- Amount as typed, in the source Account's Currency.
  amount numeric(12, 2) not null check (amount > 0),
  -- Figure the target Account receives, in the target Account's Currency.
  converted_amount numeric(12, 2) not null check (converted_amount > 0),
  -- Implied source→target rate fixed at the moment of the move.
  fx_rate numeric(12, 4) not null check (fx_rate > 0),
  moved_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfers_source_account_owner_fk
    foreign key (owner_id, source_account_id)
    references public.accounts (owner_id, id)
    on delete restrict,
  constraint transfers_target_account_owner_fk
    foreign key (owner_id, target_account_id)
    references public.accounts (owner_id, id)
    on delete restrict,
  constraint transfers_source_differs_target
    check (source_account_id <> target_account_id)
);

comment on table public.transfers is
  'Own-Account moves: third History kind, excluded from Monthly totals and the BYN aggregate (ADR-0014). Manual only, no Draft.';

create index transfers_owner_moved_on_idx
  on public.transfers (owner_id, moved_on desc);

create trigger transfers_set_updated_at
  before update on public.transfers
  for each row
  execute function public.set_updated_at();

alter table public.transfers enable row level security;

create policy transfers_select_own
  on public.transfers for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy transfers_insert_own
  on public.transfers for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy transfers_update_own
  on public.transfers for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy transfers_delete_own
  on public.transfers for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.transfers to authenticated;
grant all on public.transfers to service_role;

-- ---------------------------------------------------------------------------
-- Currency-match guard, installed after the backfill so legacy single-till
-- rows (USD typed into the one BYN till) migrate untouched.
-- ---------------------------------------------------------------------------
-- A record's Currency always equals its Account's Currency: that is what makes
-- per-Account native sums honest instead of a silent mix of typed currencies.
create or replace function public.records_match_account_currency()
returns trigger
language plpgsql
as $$
declare
  v_currency text;
begin
  select a.currency into v_currency
    from public.accounts a
   where a.id = new.account_id;

  if v_currency is null then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if new.currency is distinct from v_currency then
    raise exception 'account_currency_mismatch' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger expenses_account_currency_match
  before insert or update on public.expenses
  for each row
  execute function public.records_match_account_currency();

create trigger incomes_account_currency_match
  before insert or update on public.incomes
  for each row
  execute function public.records_match_account_currency();


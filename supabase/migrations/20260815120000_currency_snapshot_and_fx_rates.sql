-- USD display + manual USD entry: currency snapshot columns on committed rows
-- and per-user effective USD→BYN rate state (NBRB cache + manual override).
-- Spec: ADR-0013, issue #83. Canonical `amount` stays BYN and drives all aggregates.

-- ---------------------------------------------------------------------------
-- expenses / incomes: additive snapshot columns
-- ---------------------------------------------------------------------------
alter table public.expenses
  add column currency text not null default 'BYN'
    check (currency in ('BYN', 'USD')),
  add column original_amount numeric(12, 2),
  add column fx_rate numeric(12, 4);

alter table public.incomes
  add column currency text not null default 'BYN'
    check (currency in ('BYN', 'USD')),
  add column original_amount numeric(12, 2),
  add column fx_rate numeric(12, 4);

-- Snapshot fields are set only for rows entered in USD; native-BYN rows keep them null.
alter table public.expenses
  add constraint expenses_usd_snapshot_pair
    check ((currency = 'USD') or (original_amount is null and fx_rate is null));
alter table public.incomes
  add constraint incomes_usd_snapshot_pair
    check ((currency = 'USD') or (original_amount is null and fx_rate is null));

comment on column public.expenses.currency is
  'Currency the amount was typed in at Commit/Edit-save. Canonical amount stays BYN.';
comment on column public.expenses.original_amount is
  'Original typed amount (USD rows only); null for native-BYN rows.';
comment on column public.expenses.fx_rate is
  'Effective USD→BYN rate fixed at Commit/Edit-save (USD rows only).';

-- ---------------------------------------------------------------------------
-- fx_rates: one state row per user (cache may be empty before first fetch)
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  cached_rate numeric(12, 4) check (cached_rate > 0),
  cached_at timestamptz,
  override_rate numeric(12, 4) check (override_rate > 0),
  override_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fx_rates_cache_pair
    check ((cached_rate is null) = (cached_at is null)),
  constraint fx_rates_override_pair
    check ((override_rate is null) = (override_at is null))
);

comment on table public.fx_rates is
  'Per-user effective USD→BYN rate: lazy NBRB daily cache + optional manual override (ADR-0013). No rate history.';

create trigger fx_rates_set_updated_at
  before update on public.fx_rates
  for each row
  execute function public.set_updated_at();

alter table public.fx_rates enable row level security;

create policy fx_rates_select_own
  on public.fx_rates for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy fx_rates_insert_own
  on public.fx_rates for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy fx_rates_update_own
  on public.fx_rates for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update on public.fx_rates to authenticated;
grant all on public.fx_rates to service_role;

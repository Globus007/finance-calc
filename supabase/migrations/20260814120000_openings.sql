-- One Opening per user. Remainder is live on read (no remainder/totals table).
-- Spec: ADR-0012, issue #78. Unset/DELETE is out of product.

create table public.openings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  opened_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.openings is
  'One Opening per owner: BYN amount + calendar date. Remainder is computed on read.';

create trigger openings_set_updated_at
  before update on public.openings
  for each row
  execute function public.set_updated_at();

alter table public.openings enable row level security;

create policy openings_select_own
  on public.openings for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy openings_insert_own
  on public.openings for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy openings_update_own
  on public.openings for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- No DELETE policy and no DELETE grant: unset Opening is out of product.

grant select, insert, update on public.openings to authenticated;
grant all on public.openings to service_role;

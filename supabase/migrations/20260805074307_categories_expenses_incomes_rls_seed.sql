-- MVP data plane: committed categories, expenses, incomes + RLS + seed on signup.
-- Spec: ADR-0006, ADR-0001, issue #22.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  origin text not null check (origin in ('seed', 'user')),
  is_system_fallback boolean not null default false,
  is_hidden boolean not null default false,
  sort_order integer not null default 0,
  seed_key text,
  created_at timestamptz not null default now(),
  constraint categories_seed_key_requires_seed
    check (
      (origin = 'seed' and seed_key is not null)
      or (origin = 'user' and seed_key is null)
    ),
  constraint categories_system_fallback_is_seed
    check (not is_system_fallback or origin = 'seed')
);

-- Composite FK target for expenses (owner_id, category_id).
create unique index categories_owner_id_id_uidx
  on public.categories (owner_id, id);

-- Case-insensitive unique display name per owner (ADR-0006 / ADR-0001).
create unique index categories_owner_display_name_ci_uidx
  on public.categories (owner_id, lower(display_name));

-- Idempotent seed rows per owner.
create unique index categories_owner_seed_key_uidx
  on public.categories (owner_id, seed_key)
  where seed_key is not null;

-- At most one system fallback Category per owner.
create unique index categories_one_system_fallback_per_owner_uidx
  on public.categories (owner_id)
  where is_system_fallback;

create index categories_owner_id_idx on public.categories (owner_id);

comment on table public.categories is
  'Per-user Expense Categories (seed + user-defined). System fallback is seed «Прочее».';

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_on date not null,
  category_id uuid not null,
  note text,
  channel text not null check (channel in ('photo', 'voice', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_category_owner_fk
    foreign key (owner_id, category_id)
    references public.categories (owner_id, id)
    on delete restrict
);

create index expenses_owner_occurred_on_idx
  on public.expenses (owner_id, occurred_on desc);

comment on table public.expenses is
  'Committed Expenses only. Draft is client-only (ADR-0003). BYN amounts; no currency column.';

-- ---------------------------------------------------------------------------
-- incomes
-- ---------------------------------------------------------------------------
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_on date not null,
  note text,
  channel text not null check (channel in ('voice', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incomes_owner_occurred_on_idx
  on public.incomes (owner_id, occurred_on desc);

comment on table public.incomes is
  'Committed Incomes only. No category. Channels: voice | manual (ADR-0002).';

-- ---------------------------------------------------------------------------
-- updated_at helpers (Edit path)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

create trigger incomes_set_updated_at
  before update on public.incomes
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed Categories on signup (ADR-0001 list order + system fallback «Прочее»)
-- ---------------------------------------------------------------------------
create or replace function public.seed_categories_for_user(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (
    owner_id,
    display_name,
    origin,
    is_system_fallback,
    is_hidden,
    sort_order,
    seed_key
  )
  values
    (p_owner_id, 'Продукты',           'seed', false, false,  1, 'products'),
    (p_owner_id, 'Кафе и рестораны',   'seed', false, false,  2, 'cafes_restaurants'),
    (p_owner_id, 'Транспорт',          'seed', false, false,  3, 'transport'),
    (p_owner_id, 'Жильё и ЖКХ',        'seed', false, false,  4, 'housing_utilities'),
    (p_owner_id, 'Связь и интернет',   'seed', false, false,  5, 'telecom_internet'),
    (p_owner_id, 'Здоровье',           'seed', false, false,  6, 'health'),
    (p_owner_id, 'Одежда и обувь',     'seed', false, false,  7, 'clothing_shoes'),
    (p_owner_id, 'Развлечения',        'seed', false, false,  8, 'entertainment'),
    (p_owner_id, 'Подписки',           'seed', false, false,  9, 'subscriptions'),
    (p_owner_id, 'Образование',        'seed', false, false, 10, 'education'),
    (p_owner_id, 'Путешествия',        'seed', false, false, 11, 'travel'),
    (p_owner_id, 'Подарки',            'seed', false, false, 12, 'gifts'),
    (p_owner_id, 'Прочее',             'seed', true,  false, 13, 'other')
  on conflict do nothing;
end;
$$;

comment on function public.seed_categories_for_user(uuid) is
  'Inserts the 13 ADR-0001 seed Categories for a user, including system fallback «Прочее».';

create or replace function public.handle_new_user_seed_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_categories_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_categories on auth.users;

create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row
  execute function public.handle_new_user_seed_categories();

-- ---------------------------------------------------------------------------
-- RLS: owner_id = auth.uid()
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;

-- categories
create policy categories_select_own
  on public.categories for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy categories_insert_own
  on public.categories for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy categories_update_own
  on public.categories for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy categories_delete_own
  on public.categories for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- expenses
create policy expenses_select_own
  on public.expenses for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy expenses_insert_own
  on public.expenses for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy expenses_update_own
  on public.expenses for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy expenses_delete_own
  on public.expenses for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- incomes
create policy incomes_select_own
  on public.incomes for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy incomes_insert_own
  on public.incomes for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy incomes_update_own
  on public.incomes for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy incomes_delete_own
  on public.incomes for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Table privileges (explicit; matches cloud default of no auto-expose)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.incomes to authenticated;

grant all on public.categories to service_role;
grant all on public.expenses to service_role;
grant all on public.incomes to service_role;

revoke all on function public.seed_categories_for_user(uuid) from public;
revoke all on function public.handle_new_user_seed_categories() from public;
grant execute on function public.seed_categories_for_user(uuid) to service_role;
-- Trigger runs as function owner (security definer); clients do not call seed helpers.

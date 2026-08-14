-- Acceptance checks for issue #22 / ADR-0006 / ADR-0001.
-- Run: supabase test db  (requires local stack: supabase start)

begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

create schema if not exists tests;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function tests.create_user(p_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  values (
    p_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
end;
$$;

create or replace function tests.as_user(p_uid uuid)
returns void
language plpgsql
as $$
begin
  execute format('set local role authenticated');
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_uid::text,
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Tables exist; forbidden tables absent
-- ---------------------------------------------------------------------------
select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'expenses', 'expenses table exists');
select has_table('public', 'incomes', 'incomes table exists');
select has_table('public', 'openings', 'openings table exists');

select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'drafts',
        'monthly_totals',
        'remainder',
        'remainders',
        'media',
        'receipts',
        'recordings',
        'transactions'
      )
  ),
  'no drafts / monthly_totals / remainder / media / transactions tables'
);

-- ---------------------------------------------------------------------------
-- 2) Indexes and composite FK
-- ---------------------------------------------------------------------------
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'expenses'
      and indexdef ilike '%owner_id%'
      and indexdef ilike '%occurred_on%'
  ),
  'expenses has (owner_id, occurred_on) index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'incomes'
      and indexdef ilike '%owner_id%'
      and indexdef ilike '%occurred_on%'
  ),
  'incomes has (owner_id, occurred_on) index'
);

select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name = 'expenses'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.constraint_name = 'expenses_category_owner_fk'
  ),
  'expenses has composite FK expenses_category_owner_fk'
);

select ok(
  (
    select count(*) = 2
    from information_schema.key_column_usage
    where table_schema = 'public'
      and table_name = 'expenses'
      and constraint_name = 'expenses_category_owner_fk'
      and column_name in ('owner_id', 'category_id')
  ),
  'composite FK columns are (owner_id, category_id)'
);

-- ---------------------------------------------------------------------------
-- 3) RLS enabled
-- ---------------------------------------------------------------------------
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'categories'
  ),
  'RLS enabled on categories'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'expenses'
  ),
  'RLS enabled on expenses'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'incomes'
  ),
  'RLS enabled on incomes'
);

-- ---------------------------------------------------------------------------
-- 4) Seed on signup: 13 categories including «Прочее» system fallback
-- ---------------------------------------------------------------------------
select tests.create_user(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'user-a@example.com'
);

select tests.create_user(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'user-b@example.com'
);

select is(
  (
    select count(*)::integer
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  13,
  'user A receives 13 seed Categories after signup'
);

select is(
  (
    select count(*)::integer
    from public.categories
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  13,
  'user B receives 13 seed Categories after signup'
);

select ok(
  exists (
    select 1
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and display_name = 'Прочее'
      and is_system_fallback is true
      and origin = 'seed'
      and seed_key = 'other'
      and is_hidden is false
  ),
  'system fallback Category «Прочее» is seeded for user A'
);

select ok(
  (
    select array_agg(display_name order by sort_order)
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and origin = 'seed'
  ) = array[
    'Продукты',
    'Кафе и рестораны',
    'Транспорт',
    'Жильё и ЖКХ',
    'Связь и интернет',
    'Здоровье',
    'Одежда и обувь',
    'Развлечения',
    'Подписки',
    'Образование',
    'Путешествия',
    'Подарки',
    'Прочее'
  ]::text[],
  'seed Categories match ADR-0001 order and names'
);

-- ---------------------------------------------------------------------------
-- 5) RLS isolation: user A cannot read user B rows
-- ---------------------------------------------------------------------------
-- Insert B's committed rows as table owner (bypass RLS); stash B category id in GUC.
select set_config(
  'test.cat_b',
  (
    select id::text
    from public.categories
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
      and seed_key = 'products'
    limit 1
  ),
  true
);

insert into public.expenses (
  id, owner_id, amount, occurred_on, category_id, channel
) values (
  'e0000000-0000-0000-0000-0000000000bb'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  12.50,
  current_date,
  current_setting('test.cat_b')::uuid,
  'manual'
);

insert into public.incomes (
  id, owner_id, amount, occurred_on, channel
) values (
  '10000000-0000-0000-0000-0000000000bb'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  100.00,
  current_date,
  'manual'
);

-- Switch to authenticated JWT for user A
select tests.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);

select is(
  (
    select count(*)::integer
    from public.categories
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  0,
  'user A cannot SELECT user B categories (RLS)'
);

select is(
  (
    select count(*)::integer
    from public.expenses
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  0,
  'user A cannot SELECT user B expenses (RLS)'
);

select is(
  (
    select count(*)::integer
    from public.incomes
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  0,
  'user A cannot SELECT user B incomes (RLS)'
);

select is(
  (select count(*)::integer from public.categories),
  13,
  'user A sees only own 13 categories via RLS'
);

-- User A can insert own expense against own category
select lives_ok(
  $sql$
    insert into public.expenses (
      owner_id, amount, occurred_on, category_id, channel
    )
    select
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      9.99,
      current_date,
      id,
      'manual'
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and seed_key = 'products'
    limit 1
  $sql$,
  'user A can INSERT own expense'
);

-- Composite FK: own owner_id + another user's category_id
select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, amount, occurred_on, category_id, channel
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      1.00,
      current_date,
      current_setting('test.cat_b')::uuid,
      'manual'
    )
  $sql$,
  '23503',
  null,
  'composite FK blocks expense with another owner category'
);

-- Reset role for constraint checks that use bypass
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

-- ---------------------------------------------------------------------------
-- 6) Channel and amount constraints
-- ---------------------------------------------------------------------------
select throws_ok(
  $sql$
    insert into public.incomes (owner_id, amount, occurred_on, channel)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      10,
      current_date,
      'photo'
    )
  $sql$,
  '23514',
  null,
  'income channel photo is rejected'
);

select lives_ok(
  $sql$
    insert into public.expenses (
      owner_id, amount, occurred_on, category_id, channel
    )
    select
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      3.00,
      current_date,
      id,
      'photo'
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and seed_key = 'other'
    limit 1
  $sql$,
  'expense channel photo is allowed'
);

select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, amount, occurred_on, category_id, channel
    )
    select
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      0,
      current_date,
      id,
      'manual'
    from public.categories
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    limit 1
  $sql$,
  '23514',
  null,
  'expense amount must be > 0'
);

select * from finish();

rollback;

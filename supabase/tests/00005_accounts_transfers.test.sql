-- Accounts invariants, Account-scoped records, Transfers, per-Currency FX.
-- Run: supabase test db  (requires local stack: supabase start)

begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

create schema if not exists tests;

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

-- Creates a user WITHOUT the signup triggers running (no seeded Account).
create or replace function tests.create_user_bare(p_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
begin
  alter table auth.users disable trigger on_auth_user_created_seed_account;
  alter table auth.users disable trigger on_auth_user_created_seed_categories;
  perform tests.create_user(p_id, p_email);
  alter table auth.users enable trigger on_auth_user_created_seed_account;
  alter table auth.users enable trigger on_auth_user_created_seed_categories;
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

-- SECURITY DEFINER: reads another owner's Account row for negative tests,
-- where RLS would hide it from the caller.
create or replace function tests.account_id(p_uid uuid, p_default boolean default true)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.accounts
   where owner_id = p_uid and is_default = p_default
   limit 1;
$$;

create or replace function tests.seed_category(p_uid uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.categories
   where owner_id = p_uid and is_system_fallback
   limit 1;
$$;

select tests.create_user(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'acct-a@example.com'
);

select tests.create_user(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'acct-b@example.com'
);

select tests.create_user_bare(
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'acct-c@example.com'
);

-- ---------------------------------------------------------------------------
-- signup default Account
-- ---------------------------------------------------------------------------
select is(
  (
    select count(*)::integer
    from public.accounts
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  1,
  'signup creates exactly one Account'
);

select is(
  (
    select name || '/' || currency || '/' || is_default::text
    from public.accounts
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  'Наличные/BYN/true',
  'signup Account is «Наличные» BYN default'
);

select lives_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
      'Кэш',
      'BYN',
      false
    )
  $sql$,
  'first Account of an owner can be inserted'
);

select is(
  (
    select is_default
    from public.accounts
    where owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
  ),
  true,
  'the first Account is forced to be the default'
);

-- ---------------------------------------------------------------------------
-- one default per owner, immutable Currency
-- ---------------------------------------------------------------------------
select throws_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'USD карта',
      'USD',
      true
    )
  $sql$,
  '23505',
  null,
  'only one default Account per owner'
);

select lives_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'USD карта',
      'USD',
      false
    )
  $sql$,
  'owner can add a second (non-default) USD Account'
);

select throws_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'EUR вклад',
      'RUB',
      false
    )
  $sql$,
  '23514',
  null,
  'Account Currency is limited to BYN / USD / EUR'
);

select throws_ok(
  $sql$
    update public.accounts
    set currency = 'EUR'
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and currency = 'USD'
  $sql$,
  '23514',
  null,
  'Account Currency cannot change after creation'
);

select lives_ok(
  $sql$
    update public.accounts
    set name = 'USD карта (Alfa)'
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and currency = 'USD'
  $sql$,
  'Account rename is allowed'
);

select throws_ok(
  $sql$
    update public.accounts
    set name = '   '
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and currency = 'USD'
  $sql$,
  '23514',
  null,
  'Account name cannot be blank'
);

-- ---------------------------------------------------------------------------
-- delete rules: last Account, non-empty Account, default promotion
-- ---------------------------------------------------------------------------
select throws_ok(
  $sql$
    delete from public.accounts
    where owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
  $sql$,
  '23514',
  null,
  'the last Account of an owner cannot be deleted'
);

insert into public.expenses (
  owner_id,
  account_id,
  amount,
  currency,
  occurred_on,
  category_id,
  channel
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  10.00,
  'BYN',
  current_date,
  tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  'manual'
);

select throws_ok(
  $sql$
    delete from public.accounts
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and is_default
  $sql$,
  '23503',
  null,
  'an Account with records cannot be deleted (FK restrict)'
);

select lives_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      'EUR вклад',
      'EUR',
      false
    )
  $sql$,
  'EUR Account can be created'
);

select lives_ok(
  $sql$
    delete from public.accounts
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
      and currency = 'EUR'
  $sql$,
  'an empty non-default Account can be deleted'
);

-- ---------------------------------------------------------------------------
-- record Currency follows Account Currency
-- ---------------------------------------------------------------------------
select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, amount, currency, occurred_on, category_id, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      10.00,
      'BYN',
      current_date,
      tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      'manual'
    )
  $sql$,
  '23502',
  null,
  'a committed Expense must name an Account'
);

select throws_ok(
  $sql$
    insert into public.incomes (
      owner_id, amount, currency, occurred_on, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      10.00,
      'BYN',
      current_date,
      'manual'
    )
  $sql$,
  '23502',
  null,
  'a committed Income must name an Account'
);


select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, account_id, amount, currency, occurred_on, category_id, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      10.00,
      'USD',
      current_date,
      tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      'manual'
    )
  $sql$,
  '23514',
  null,
  'record Currency must equal its Account Currency'
);

select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, account_id, amount, currency, occurred_on, category_id, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
      10.00,
      'BYN',
      current_date,
      tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      'manual'
    )
  $sql$,
  '23503',
  null,
  'record cannot point at another owner''s Account'
);

-- USD Account of owner A (created above) accepts a EUR-free USD snapshot row.
select lives_ok(
  $sql$
    insert into public.expenses (
      owner_id, account_id, amount, currency, original_amount, fx_rate,
      occurred_on, category_id, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      (
        select id from public.accounts
        where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
          and currency = 'USD'
      ),
      33.00,
      'USD',
      10.00,
      3.30,
      current_date,
      tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      'manual'
    )
  $sql$,
  'USD Account accepts a USD row with a snapshot'
);

select throws_ok(
  $sql$
    insert into public.expenses (
      owner_id, account_id, amount, currency, occurred_on, category_id, channel
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      (
        select id from public.accounts
        where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
          and currency = 'USD'
      ),
      33.00,
      'USD',
      current_date,
      tests.seed_category('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      'manual'
    )
  $sql$,
  '23514',
  null,
  'non-BYN row requires the native snapshot'
);

-- ---------------------------------------------------------------------------
-- per-Account Opening + per-Currency FX state
-- ---------------------------------------------------------------------------
select lives_ok(
  $sql$
    insert into public.openings (owner_id, account_id, amount, opened_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      0,
      current_date
    )
  $sql$,
  'Opening can be set for the default Account'
);

select lives_ok(
  $sql$
    insert into public.openings (owner_id, account_id, amount, opened_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      (
        select id from public.accounts
        where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
          and currency = 'USD'
      ),
      100.00,
      current_date
    )
  $sql$,
  'a second Account of the same owner gets its own Opening'
);

select throws_ok(
  $sql$
    insert into public.openings (owner_id, account_id, amount, opened_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      5,
      current_date
    )
  $sql$,
  '23505',
  null,
  'one Opening per (owner, Account)'
);

select lives_ok(
  $sql$
    insert into public.fx_rates (owner_id, currency, cached_rate, cached_at)
    values
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'USD', 3.3012, now()),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'EUR', 3.6000, now())
  $sql$,
  'FX state exists per Currency for one owner'
);

select throws_ok(
  $sql$
    insert into public.fx_rates (owner_id, currency, cached_rate, cached_at)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'USD',
      3.4,
      now()
    )
  $sql$,
  '23505',
  null,
  'one FX state row per (owner, Currency)'
);

select throws_ok(
  $sql$
    insert into public.fx_rates (owner_id, currency)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'BYN'
    )
  $sql$,
  '23514',
  null,
  'BYN needs no FX rate row'
);

-- ---------------------------------------------------------------------------
-- transfers
-- ---------------------------------------------------------------------------
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'transfers'
  ),
  'RLS enabled on transfers'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'accounts'
  ),
  'RLS enabled on accounts'
);

select lives_ok(
  $sql$
    insert into public.transfers (
      owner_id, source_account_id, target_account_id,
      amount, converted_amount, fx_rate, moved_on, note
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      (
        select id from public.accounts
        where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
          and currency = 'USD'
      ),
      33.00,
      10.00,
      0.3030,
      current_date,
      'пополнение карты'
    )
  $sql$,
  'owner can INSERT a Transfer between own Accounts'
);

select throws_ok(
  $sql$
    insert into public.transfers (
      owner_id, source_account_id, target_account_id,
      amount, converted_amount, fx_rate, moved_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      10.00,
      10.00,
      1,
      current_date
    )
  $sql$,
  '23514',
  null,
  'source and target must differ'
);

select throws_ok(
  $sql$
    insert into public.transfers (
      owner_id, source_account_id, target_account_id,
      amount, converted_amount, fx_rate, moved_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      0,
      10.00,
      1,
      current_date
    )
  $sql$,
  '23514',
  null,
  'Transfer amount must be > 0'
);

select throws_ok(
  $sql$
    insert into public.transfers (
      owner_id, source_account_id, target_account_id,
      amount, converted_amount, fx_rate, moved_on
    )
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      tests.account_id('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      10.00,
      10.00,
      1,
      current_date
    )
  $sql$,
  '23503',
  null,
  'Transfer cannot use another owner''s Account'
);

select throws_ok(
  $sql$
    insert into public.transfers (
      owner_id, source_account_id, target_account_id,
      amount, converted_amount, fx_rate, moved_on
    )
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      tests.account_id('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
      tests.account_id('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
      10.00,
      10.00,
      1,
      current_date
    )
  $sql$,
  '23503',
  null,
  'Transfer target must belong to the same owner'
);

select tests.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);

select is(
  (select count(*)::integer from public.transfers),
  0,
  'user B sees no Transfers of user A via RLS'
);

select is(
  (select count(*)::integer from public.accounts),
  1,
  'user B sees only own Accounts via RLS'
);

select throws_ok(
  $sql$
    insert into public.accounts (owner_id, name, currency, is_default)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'чужой счёт',
      'BYN',
      false
    )
  $sql$,
  '42501',
  null,
  'user B cannot INSERT an Account for user A'
);

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

-- A Transfer pins both Accounts: deleting either endpoint is refused.
select throws_ok(
  $sql$
    delete from public.accounts
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
      and currency = 'USD'
  $sql$,
  '23503',
  null,
  'an Account used by a Transfer cannot be deleted'
);

select * from finish();

rollback;

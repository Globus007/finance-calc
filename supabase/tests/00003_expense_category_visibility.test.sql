-- Atomic hidden-Category rule on expenses (migration expenses_reject_hidden_category).
-- Run: supabase test db  (requires local stack: supabase start)

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

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
-- Fixture: user + visible and hidden seed Categories + one Expense
-- ---------------------------------------------------------------------------
select tests.create_user(
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'vis@example.com'
);

select set_config(
  'test.cat_products',
  (
    select id::text
    from public.categories
    where owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
      and seed_key = 'products'
    limit 1
  ),
  true
);

select set_config(
  'test.cat_transport',
  (
    select id::text
    from public.categories
    where owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
      and seed_key = 'transport'
    limit 1
  ),
  true
);

-- Hide transport (not system fallback).
update public.categories
set is_hidden = true
where id = current_setting('test.cat_transport')::uuid;

insert into public.expenses (
  id, owner_id, amount, occurred_on, category_id, channel
) values (
  'e0000000-0000-0000-0000-0000000000cc'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  10.00,
  current_date,
  current_setting('test.cat_products')::uuid,
  'manual'
);

select tests.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);

-- ---------------------------------------------------------------------------
-- INSERT: hidden Category rejected
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $sql$
      insert into public.expenses (
        owner_id, amount, occurred_on, category_id, channel
      ) values (
        'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
        1.00,
        current_date,
        %L::uuid,
        'manual'
      )
    $sql$,
    current_setting('test.cat_transport')
  ),
  'P0002',
  'category_hidden',
  'INSERT rejects hidden Category'
);

-- ---------------------------------------------------------------------------
-- UPDATE: switch to hidden Category rejected
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $sql$
      update public.expenses
      set category_id = %L::uuid
      where id = 'e0000000-0000-0000-0000-0000000000cc'::uuid
    $sql$,
    current_setting('test.cat_transport')
  ),
  'P0002',
  'category_hidden',
  'UPDATE to a different hidden Category is rejected'
);

-- ---------------------------------------------------------------------------
-- UPDATE: keep current Category after it becomes hidden — allowed
-- ---------------------------------------------------------------------------
update public.categories
set is_hidden = true
where id = current_setting('test.cat_products')::uuid;

select lives_ok(
  $sql$
    update public.expenses
    set amount = 11.00,
        category_id = category_id
    where id = 'e0000000-0000-0000-0000-0000000000cc'::uuid
  $sql$,
  'UPDATE keeping current Category succeeds even when Category is hidden'
);

select is(
  (
    select amount
    from public.expenses
    where id = 'e0000000-0000-0000-0000-0000000000cc'::uuid
  ),
  11.00,
  'amount update applied while keeping hidden current Category'
);

-- ---------------------------------------------------------------------------
-- UPDATE: visible Category switch still works
-- ---------------------------------------------------------------------------
update public.categories
set is_hidden = false
where id = current_setting('test.cat_transport')::uuid;

select lives_ok(
  format(
    $sql$
      update public.expenses
      set category_id = %L::uuid
      where id = 'e0000000-0000-0000-0000-0000000000cc'::uuid
    $sql$,
    current_setting('test.cat_transport')
  ),
  'UPDATE to a visible Category succeeds'
);

select is(
  (
    select category_id::text
    from public.expenses
    where id = 'e0000000-0000-0000-0000-0000000000cc'::uuid
  ),
  current_setting('test.cat_transport'),
  'Expense category_id moved to visible Category'
);

select * from finish();

rollback;

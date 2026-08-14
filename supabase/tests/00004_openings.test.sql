-- Opening persistence: one row per owner, amount >= 0, owner RLS, no DELETE.
-- Run: supabase test db  (requires local stack: supabase start)

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

select tests.create_user(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'open-a@example.com'
);

select tests.create_user(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'open-b@example.com'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'openings'
  ),
  'RLS enabled on openings'
);

insert into public.openings (owner_id, amount, opened_on)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  80.00,
  current_date
);

select tests.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);

select lives_ok(
  $sql$
    insert into public.openings (owner_id, amount, opened_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      0,
      current_date
    )
  $sql$,
  'owner can INSERT Opening amount 0'
);

select is(
  (select count(*)::integer from public.openings),
  1,
  'user A sees only own Opening via RLS'
);

select is(
  (
    select count(*)::integer
    from public.openings
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  0,
  'user A cannot SELECT user B Opening'
);

select lives_ok(
  $sql$
    update public.openings
    set amount = 125.50, opened_on = current_date
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  $sql$,
  'owner can UPDATE own Opening (replace)'
);

select is(
  (
    select amount
    from public.openings
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  125.50,
  'replaced Opening amount is the new value'
);

-- RLS UPDATE of another owner is a no-op (0 rows), not a constraint error.
update public.openings
set amount = 1
where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

select throws_ok(
  $sql$
    insert into public.openings (owner_id, amount, opened_on)
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      1,
      current_date
    )
  $sql$,
  '42501',
  null,
  'user A cannot INSERT an Opening for user B'
);

select throws_ok(
  $sql$
    delete from public.openings
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  $sql$,
  '42501',
  null,
  'DELETE on openings is denied'
);

select is(
  (
    select count(*)::integer
    from public.openings
    where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ),
  1,
  'own Opening still exists after denied DELETE'
);

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select is(
  (
    select amount
    from public.openings
    where owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  ),
  80.00,
  'user A UPDATE did not change user B Opening'
);

select throws_ok(
  $sql$
    insert into public.openings (owner_id, amount, opened_on)
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      -1,
      current_date
    )
  $sql$,
  '23514',
  null,
  'Opening amount must be >= 0'
);

select throws_ok(
  $sql$
    insert into public.openings (owner_id, amount, opened_on)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      5,
      current_date
    )
  $sql$,
  '23505',
  null,
  'one Opening row per owner'
);

select * from finish();

rollback;

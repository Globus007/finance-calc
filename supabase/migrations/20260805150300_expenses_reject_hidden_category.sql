-- Atomic Category visibility for Expense writes.
-- CONTEXT: Hide omits a Category from new pickers; Edit may keep a hidden
-- Category only as the Expense's current value. App-level check-then-update
-- races with concurrent Hide — enforce the rule in the write path.
--
-- The visibility lookup takes a FOR SHARE row lock on the Category so it
-- serializes against a concurrent Hide (which UPDATEs categories.is_hidden
-- and thus holds FOR UPDATE on the same row). Under READ COMMITTED the
-- SELECT ... FOR SHARE waits for any in-flight Hide to commit/abort and then
-- reads the newest committed is_hidden, closing the check-then-act race that
-- a plain SELECT leaves open. FOR SHARE (rather than FOR UPDATE) still lets
-- concurrent Expense writes target the same Category.

create or replace function public.enforce_expense_category_visibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cat_is_hidden boolean;
begin
  -- Keeping the same category_id is always allowed (hidden current on Edit).
  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  -- FOR SHARE (not plain SELECT) blocks a concurrent Hide of this Category
  -- until our row version of is_hidden is read; see the migration header.
  select c.is_hidden
    into cat_is_hidden
  from public.categories c
  where c.id = new.category_id
    and c.owner_id = new.owner_id
  for share;

  -- Missing / cross-owner Category is the composite FK's job.
  if not found then
    return new;
  end if;

  if cat_is_hidden then
    -- P0002: app maps this to category_hidden (not a generic check_violation).
    raise exception using
      errcode = 'P0002',
      message = 'category_hidden',
      detail =
        'Cannot assign a hidden Category unless it is already the Expense current Category';
  end if;

  return new;
end;
$$;

comment on function public.enforce_expense_category_visibility() is
  'Rejects INSERT/UPDATE of expenses.category_id to a hidden Category unless the Expense already uses that Category (Edit keep-current rule).';

drop trigger if exists expenses_enforce_category_visibility on public.expenses;

create trigger expenses_enforce_category_visibility
  before insert or update of category_id on public.expenses
  for each row
  execute function public.enforce_expense_category_visibility();

-- Paid back for a specific expense, and simplified payments on by default.
-- Run after feedback.sql. Safe to run twice.

-- A payment can point at the expense it pays back ("Paid on the spot", "Mark paid back").
-- Deleting the expense deletes those payments too, so balances never drift.
alter table public.settlements
  add column if not exists expense_id uuid references public.expenses(id) on delete cascade;
create index if not exists settlements_expense_idx on public.settlements(expense_id);

-- New trips start with the fewest payments; admins can still switch to pay-back-by-person.
alter table public.groups alter column simplify_debts set default true;

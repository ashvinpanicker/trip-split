-- Paid back for a specific expense.
-- Run after feedback.sql. Safe to run twice.

-- A payment can point at the expense it pays back ("Paid on the spot", "Mark paid back").
-- Deleting the expense deletes those payments too, so balances never drift.
alter table public.settlements
  add column if not exists expense_id uuid references public.expenses(id) on delete cascade;
create index if not exists settlements_expense_idx on public.settlements(expense_id);

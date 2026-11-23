-- ============================================================
-- TripSplit — v2 upgrade (Goa edition)
-- Run AFTER schema.sql, fix_rls_recursion.sql, add_pending_members.sql.
-- Safe to re-run.
--
-- Adds:
--   • profiles.upi_id            — one-tap UPI payments when settling up
--   • expenses.category          — food / drinks / stay / travel / activities / shopping / other
--   • expenses.paid_by_pending   — people who haven't signed up can be the payer
--   • settlements table          — record "X paid Y ₹N" so balances actually clear
-- ============================================================

-- 1. UPI ID on profiles
alter table public.profiles add column if not exists upi_id text;

-- 2. Expense category
alter table public.expenses add column if not exists category text not null default 'other';

-- 3. Pending members can pay
alter table public.expenses alter column paid_by drop not null;
alter table public.expenses
  add column if not exists paid_by_pending uuid references public.pending_members(id) on delete set null;

alter table public.expenses drop constraint if exists expense_has_payer;
alter table public.expenses
  add constraint expense_has_payer check (paid_by is not null or paid_by_pending is not null);

-- 4. Settlements (payments between people)
--    from_person / to_person hold either a profile id or a pending_members id.
create table if not exists public.settlements (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  from_person uuid not null,
  to_person uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  check (from_person <> to_person)
);

create index if not exists settlements_group_idx on public.settlements(group_id);

alter table public.settlements enable row level security;

drop policy if exists "settlements_select" on public.settlements;
drop policy if exists "settlements_insert" on public.settlements;
drop policy if exists "settlements_delete" on public.settlements;

create policy "settlements_select" on public.settlements
  for select using (public.is_group_member(group_id));

create policy "settlements_insert" on public.settlements
  for insert with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy "settlements_delete" on public.settlements
  for delete using (public.is_group_member(group_id));

-- 5. Claiming a pending slot now also moves payer + settlement rows to the real user
create or replace function public.claim_pending_member(p_invite_token text)
returns json
language plpgsql security definer as $$
declare
  v_pending public.pending_members%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  select * into v_pending
  from public.pending_members
  where invite_token = p_invite_token;

  if not found then
    return json_build_object('error', 'Invalid invite token');
  end if;

  if v_pending.claimed_by is not null and v_pending.claimed_by <> v_user_id then
    insert into public.group_members (group_id, user_id, role)
    values (v_pending.group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do nothing;
    return json_build_object('group_id', v_pending.group_id, 'already_claimed', true);
  end if;

  update public.pending_members
  set claimed_by = v_user_id, claimed_at = now()
  where id = v_pending.id;

  update public.expense_participants
  set user_id = v_user_id
  where pending_member_id = v_pending.id;

  update public.expenses
  set paid_by = v_user_id
  where paid_by_pending = v_pending.id;

  update public.settlements set from_person = v_user_id where from_person = v_pending.id;
  update public.settlements set to_person   = v_user_id where to_person   = v_pending.id;

  insert into public.group_members (group_id, user_id, role)
  values (v_pending.group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return json_build_object('group_id', v_pending.group_id, 'success', true);
end;
$$;

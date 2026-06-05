-- ============================================================
-- TripSplit — Definitive RLS Reset
-- Paste the ENTIRE contents into Supabase SQL Editor and Run.
-- ============================================================

-- Step 1: Drop every policy on every app table (whatever name it has)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','groups','group_members','expenses','expense_participants')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Step 2: Drop and recreate the membership helper function.
-- security definer = runs as the function owner, bypassing RLS.
-- This breaks the recursion: policies can call this function to
-- check group_members without triggering group_members policies again.
drop function if exists public.is_group_member(uuid);

create function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ============================================================
-- Step 3: Recreate all policies
-- ============================================================

-- PROFILES
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- GROUPS
create policy "groups_select" on public.groups
  for select using (public.is_group_member(id));

create policy "groups_insert" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_update" on public.groups
  for update using (public.is_group_member(id) and created_by = auth.uid());

create policy "groups_delete" on public.groups
  for delete using (created_by = auth.uid());

-- GROUP_MEMBERS
-- SELECT: use the security definer fn — no self-reference, no recursion
create policy "group_members_select" on public.group_members
  for select using (public.is_group_member(group_id));

-- INSERT: anyone can insert a row for themselves (joining a group)
create policy "group_members_insert" on public.group_members
  for insert with check (auth.uid() = user_id);

-- DELETE: you can leave, or remove others if you're a member (admin check kept simple)
create policy "group_members_delete" on public.group_members
  for delete using (auth.uid() = user_id or public.is_group_member(group_id));

-- EXPENSES
create policy "expenses_select" on public.expenses
  for select using (public.is_group_member(group_id));

create policy "expenses_insert" on public.expenses
  for insert with check (
    auth.uid() = created_by and public.is_group_member(group_id)
  );

create policy "expenses_update" on public.expenses
  for update using (
    auth.uid() = created_by or public.is_group_member(group_id)
  );

create policy "expenses_delete" on public.expenses
  for delete using (
    auth.uid() = created_by or public.is_group_member(group_id)
  );

-- EXPENSE_PARTICIPANTS
create policy "expense_participants_select" on public.expense_participants
  for select using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy "expense_participants_insert" on public.expense_participants
  for insert with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy "expense_participants_update" on public.expense_participants
  for update using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or public.is_group_member(e.group_id)
      )
    )
  );

create policy "expense_participants_delete" on public.expense_participants
  for delete using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or public.is_group_member(e.group_id)
      )
    )
  );

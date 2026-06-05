-- Fix infinite recursion in group_members RLS policies
-- Run this entire script in Supabase SQL Editor

-- Step 1: Create a security definer function that checks membership
-- without triggering RLS (breaks the recursion)
create or replace function public.is_group_member(gid uuid)
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

-- Step 2: Drop all old policies that caused recursion
drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Admin can manage members" on public.group_members;
drop policy if exists "Group members can view group" on public.groups;
drop policy if exists "Authenticated users can create groups" on public.groups;
drop policy if exists "Group admin can update group" on public.groups;
drop policy if exists "Group admin can delete group" on public.groups;
drop policy if exists "Group members can view expenses" on public.expenses;
drop policy if exists "Group members can create expenses" on public.expenses;
drop policy if exists "Expense creator or admin can update expense" on public.expenses;
drop policy if exists "Expense creator or admin can delete expense" on public.expenses;
drop policy if exists "Group members can view expense participants" on public.expense_participants;
drop policy if exists "Group members can manage expense participants" on public.expense_participants;
drop policy if exists "Expense creator can update participants" on public.expense_participants;
drop policy if exists "Expense creator can delete participants" on public.expense_participants;

-- Step 3: Recreate group_members policies using the function
create policy "Group members can view membership"
  on public.group_members for select
  using (public.is_group_member(group_id));

create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Members can leave, admins can remove"
  on public.group_members for delete
  using (
    user_id = auth.uid() or
    public.is_group_member(group_id)
  );

-- Step 4: Recreate groups policies using the function
create policy "Group members can view group"
  on public.groups for select
  using (public.is_group_member(id));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Group admin can update group"
  on public.groups for update
  using (created_by = auth.uid());

create policy "Group admin can delete group"
  on public.groups for delete
  using (created_by = auth.uid());

-- Step 5: Recreate expenses policies using the function
create policy "Group members can view expenses"
  on public.expenses for select
  using (public.is_group_member(group_id));

create policy "Group members can create expenses"
  on public.expenses for insert
  with check (
    auth.uid() = created_by and
    public.is_group_member(group_id)
  );

create policy "Expense creator or admin can update expense"
  on public.expenses for update
  using (
    created_by = auth.uid() or
    public.is_group_member(group_id)
  );

create policy "Expense creator or admin can delete expense"
  on public.expenses for delete
  using (
    created_by = auth.uid() or
    public.is_group_member(group_id)
  );

-- Step 6: Recreate expense_participants policies using the function
create policy "Group members can view expense participants"
  on public.expense_participants for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy "Group members can manage expense participants"
  on public.expense_participants for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy "Expense creator can update participants"
  on public.expense_participants for update
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or public.is_group_member(e.group_id)
      )
    )
  );

create policy "Expense creator can delete participants"
  on public.expense_participants for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or public.is_group_member(e.group_id)
      )
    )
  );

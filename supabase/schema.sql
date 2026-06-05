-- ============================================================
-- Trip Split - Supabase Database Schema
-- Run this entire script at once in the SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CREATE ALL TABLES FIRST
-- ============================================================

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create type public.member_role as enum ('admin', 'member');

create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  invite_code text unique default substring(md5(random()::text), 1, 8),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role member_role default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

create type public.split_type as enum ('equal', 'percentage', 'fixed');

create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  paid_by uuid references public.profiles(id) on delete restrict not null,
  split_type split_type not null default 'equal',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.expense_participants (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  share_percentage numeric(5, 2) check (share_percentage >= 0 and share_percentage <= 100),
  unique(expense_id, user_id)
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

create policy "Users can view any profile"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- GROUPS POLICIES
-- ============================================================

create policy "Group members can view group"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Group admin can update group"
  on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create policy "Group admin can delete group"
  on public.groups for delete
  using (created_by = auth.uid());

-- ============================================================
-- GROUP MEMBERS POLICIES
-- ============================================================

create policy "Group members can view membership"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Admin can manage members"
  on public.group_members for delete
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- ============================================================
-- EXPENSES POLICIES
-- ============================================================

create policy "Group members can view expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can create expenses"
  on public.expenses for insert
  with check (
    auth.uid() = created_by and
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

create policy "Expense creator or admin can update expense"
  on public.expenses for update
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create policy "Expense creator or admin can delete expense"
  on public.expenses for delete
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- ============================================================
-- EXPENSE PARTICIPANTS POLICIES
-- ============================================================

create policy "Group members can view expense participants"
  on public.expense_participants for select
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can manage expense participants"
  on public.expense_participants for insert
  with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_id and gm.user_id = auth.uid()
    )
  );

create policy "Expense creator can update participants"
  on public.expense_participants for update
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or
        exists (
          select 1 from public.group_members gm
          where gm.group_id = e.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
        )
      )
    )
  );

create policy "Expense creator can delete participants"
  on public.expense_participants for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and (
        e.created_by = auth.uid() or
        exists (
          select 1 from public.group_members gm
          where gm.group_id = e.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
        )
      )
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger update_groups_updated_at
  before update on public.groups
  for each row execute procedure public.update_updated_at();

create trigger update_expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_expenses_group_id on public.expenses(group_id);
create index idx_expenses_paid_by on public.expenses(paid_by);
create index idx_expense_participants_expense_id on public.expense_participants(expense_id);
create index idx_expense_participants_user_id on public.expense_participants(user_id);
create index idx_groups_invite_code on public.groups(invite_code);

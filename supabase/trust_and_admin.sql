-- ============================================================
-- TripSplit — admin settings, role management, activity log, security fixes
-- Run after atomic_expenses.sql. Safe to re-run.
-- ============================================================

-- ── Group setting: simplify payments (off = everyone pays back who paid for them)
alter table public.groups add column if not exists simplify_debts boolean not null default false;

-- ── Helpers (security definer so they don't recurse through RLS)
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_group_creator(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.groups where id = gid and created_by = auth.uid());
$$;

-- ── Security fixes
-- Joining via invite could self-assign role = 'admin'. Only the creator may add themselves as admin.
drop policy if exists "Users can join groups" on public.group_members;
create policy "Users can join groups" on public.group_members for insert
  with check (auth.uid() = user_id and (role = 'member' or public.is_group_creator(group_id)));

-- Any member could remove any other member. Now: leave yourself, or an admin removes you.
drop policy if exists "Members can leave, admins can remove" on public.group_members;
drop policy if exists "Admin can manage members" on public.group_members;
create policy "Members can leave, admins can remove" on public.group_members for delete
  using (user_id = auth.uid() or public.is_group_admin(group_id));

-- Group settings: any admin (not only the creator) can update
drop policy if exists "Group admin can update group" on public.groups;
create policy "Group admin can update group" on public.groups for update
  using (public.is_group_admin(id));

-- ── Promote / demote (never leaves a group without an admin)
create or replace function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer as $$
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only admins can change roles';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role %', p_role;
  end if;
  if p_role = 'member'
     and exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_user_id and role = 'admin')
     and (select count(*) from public.group_members where group_id = p_group_id and role = 'admin') <= 1 then
    raise exception 'A group needs at least one admin';
  end if;
  update public.group_members set role = p_role::public.member_role
  where group_id = p_group_id and user_id = p_user_id;
  if not found then
    raise exception 'That person isn''t a member of this group';
  end if;
end;
$$;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- ── Activity log
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  actor uuid references public.profiles(id) on delete set null,
  action text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_group_idx on public.activity_log(group_id, created_at desc);
alter table public.activity_log enable row level security;
drop policy if exists "activity_select" on public.activity_log;
create policy "activity_select" on public.activity_log for select using (public.is_group_member(group_id));
-- no insert/update/delete policies: only the triggers below write here

create or replace function public.person_name(pid uuid)
returns text language sql security definer stable as $$
  select coalesce(
    (select coalesce(nullif(full_name, ''), email) from public.profiles where id = pid),
    (select name from public.pending_members where id = pid),
    'Someone');
$$;

create or replace function public.log_activity()
returns trigger language plpgsql security definer as $$
declare
  g uuid;
  act text;
  d jsonb := '{}'::jsonb;
begin
  if TG_TABLE_NAME = 'expenses' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'expense_added';
      d := jsonb_build_object('title', new.title, 'amount', new.amount,
             'payer', public.person_name(coalesce(new.paid_by, new.paid_by_pending)));
    elsif TG_OP = 'UPDATE' then
      g := new.group_id; act := 'expense_edited';
      d := jsonb_build_object('title', new.title, 'old_title', old.title, 'amount', new.amount, 'old_amount', old.amount);
    else
      g := old.group_id; act := 'expense_deleted';
      d := jsonb_build_object('title', old.title, 'amount', old.amount);
    end if;

  elsif TG_TABLE_NAME = 'settlements' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'payment_recorded';
      d := jsonb_build_object('from', public.person_name(new.from_person), 'to', public.person_name(new.to_person), 'amount', new.amount);
    else
      g := old.group_id; act := 'payment_deleted';
      d := jsonb_build_object('from', public.person_name(old.from_person), 'to', public.person_name(old.to_person), 'amount', old.amount);
    end if;

  elsif TG_TABLE_NAME = 'pending_members' then
    if TG_OP = 'INSERT' then
      g := new.group_id; act := 'person_added'; d := jsonb_build_object('name', new.name);
    elsif TG_OP = 'UPDATE' and old.claimed_by is null and new.claimed_by is not null then
      g := new.group_id; act := 'name_claimed';
      d := jsonb_build_object('name', new.name, 'by', public.person_name(new.claimed_by));
    else
      return null;
    end if;

  elsif TG_TABLE_NAME = 'group_members' then
    if TG_OP = 'INSERT' then
      -- creator joining their own new group, or someone who just claimed a name: already covered
      if public.is_group_creator(new.group_id) and new.user_id = auth.uid() and new.role = 'admin' then return null; end if;
      if exists (select 1 from public.pending_members where group_id = new.group_id and claimed_by = new.user_id) then return null; end if;
      g := new.group_id; act := 'member_joined'; d := jsonb_build_object('name', public.person_name(new.user_id));
    elsif TG_OP = 'UPDATE' and old.role is distinct from new.role then
      g := new.group_id; act := 'role_changed';
      d := jsonb_build_object('name', public.person_name(new.user_id), 'role', new.role);
    else
      return null;
    end if;

  elsif TG_TABLE_NAME = 'groups' then
    if old.simplify_debts is distinct from new.simplify_debts then
      g := new.id; act := 'setting_changed'; d := jsonb_build_object('simplify_debts', new.simplify_debts);
    else
      return null;
    end if;
  end if;

  -- Skip when the whole group is being deleted (cascade)
  if g is null or not exists (select 1 from public.groups where id = g) then
    return null;
  end if;

  insert into public.activity_log (group_id, actor, action, data) values (g, auth.uid(), act, d);
  return null;
end;
$$;

drop trigger if exists log_expenses on public.expenses;
create trigger log_expenses after insert or update or delete on public.expenses
  for each row execute function public.log_activity();

drop trigger if exists log_settlements on public.settlements;
create trigger log_settlements after insert or delete on public.settlements
  for each row execute function public.log_activity();

drop trigger if exists log_pending on public.pending_members;
create trigger log_pending after insert or update on public.pending_members
  for each row execute function public.log_activity();

drop trigger if exists log_members on public.group_members;
create trigger log_members after insert or update on public.group_members
  for each row execute function public.log_activity();

drop trigger if exists log_groups on public.groups;
create trigger log_groups after update on public.groups
  for each row execute function public.log_activity();

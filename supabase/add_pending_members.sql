-- ============================================================
-- TripSplit — Add Pending Members
-- Run in Supabase SQL Editor
-- ============================================================

-- Table for people added by name before they have an account
create table public.pending_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  name text not null,
  email text,
  -- Personal invite token — share as /join/GROUP_CODE?for=THIS_TOKEN
  invite_token text unique default substring(md5(random()::text || clock_timestamp()::text), 1, 16) not null,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Allow pending members as expense participants
alter table public.expense_participants
  alter column user_id drop not null,
  add column pending_member_id uuid references public.pending_members(id) on delete cascade;

-- At least one identity must be set
alter table public.expense_participants
  add constraint participant_has_identity
  check (user_id is not null or pending_member_id is not null);

-- Prevent duplicate pending member entries per expense
create unique index expense_participants_pending_unique
  on public.expense_participants(expense_id, pending_member_id)
  where pending_member_id is not null;

-- ============================================================
-- RLS for pending_members
-- ============================================================

alter table public.pending_members enable row level security;

create policy "pending_select" on public.pending_members
  for select using (public.is_group_member(group_id));

create policy "pending_insert" on public.pending_members
  for insert with check (public.is_group_member(group_id));

create policy "pending_delete" on public.pending_members
  for delete using (public.is_group_member(group_id));

-- ============================================================
-- Public lookup functions (security definer = bypass RLS)
-- Used by the join page before the user is authenticated
-- ============================================================

-- Look up a group by invite code (for the join page preview)
create or replace function public.get_group_by_invite_code(p_code text)
returns table(id uuid, name text, description text, member_count bigint)
language sql security definer stable as $$
  select g.id, g.name, g.description,
    (select count(*) from public.group_members where group_id = g.id)::bigint
  from public.groups g
  where g.invite_code = p_code;
$$;

-- Look up a pending member by personal invite token
create or replace function public.get_pending_member_info(p_token text)
returns table(id uuid, name text, group_id uuid, group_name text, group_invite_code text)
language sql security definer stable as $$
  select pm.id, pm.name, pm.group_id, g.name, g.invite_code
  from public.pending_members pm
  join public.groups g on g.id = pm.group_id
  where pm.invite_token = p_token and pm.claimed_by is null;
$$;

-- Claim a pending member slot: ties expenses to the signed-in user
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

  -- If already claimed by someone else, just join the group
  if v_pending.claimed_by is not null and v_pending.claimed_by <> v_user_id then
    insert into public.group_members (group_id, user_id, role)
    values (v_pending.group_id, v_user_id, 'member')
    on conflict (group_id, user_id) do nothing;
    return json_build_object('group_id', v_pending.group_id, 'already_claimed', true);
  end if;

  -- Claim
  update public.pending_members
  set claimed_by = v_user_id, claimed_at = now()
  where id = v_pending.id;

  -- Tie all existing expense participants to the real user
  update public.expense_participants
  set user_id = v_user_id
  where pending_member_id = v_pending.id;

  -- Join the group
  insert into public.group_members (group_id, user_id, role)
  values (v_pending.group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return json_build_object('group_id', v_pending.group_id, 'success', true);
end;
$$;

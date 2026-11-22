-- TripSplit — "your balance" links (no sign-in needed)
-- Run after multi_currency.sql (it reads expenses.fx).
-- A trip member creates a link for one person; anyone with the link sees that trip's
-- balances and how to pay, read-only. The token is a random UUID; it can be revoked by deleting the row.

create table if not exists public.balance_links (
  token uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null,          -- profiles.id or pending_members.id
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, person_id)
);
alter table public.balance_links enable row level security;
drop policy if exists "balance_links_select" on public.balance_links;
create policy "balance_links_select" on public.balance_links for select using (public.is_group_member(group_id));
drop policy if exists "balance_links_delete" on public.balance_links;
create policy "balance_links_delete" on public.balance_links for delete using (public.is_group_member(group_id));

-- Get (or make) the link for a person in a trip. Members only.
create or replace function public.balance_link_for(p_group_id uuid, p_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare t uuid;
begin
  if not public.is_group_member(p_group_id) then raise exception 'Not a member of this trip'; end if;
  if not exists (select 1 from group_members where group_id = p_group_id and user_id = p_person_id)
     and not exists (select 1 from pending_members where group_id = p_group_id and id = p_person_id) then
    raise exception 'That person is not on this trip';
  end if;
  insert into balance_links (group_id, person_id, created_by)
    values (p_group_id, p_person_id, auth.uid())
    on conflict (group_id, person_id) do nothing;
  select token into t from balance_links where group_id = p_group_id and person_id = p_person_id;
  return t;
end $$;
grant execute on function public.balance_link_for(uuid, uuid) to authenticated;

-- Everything the public page needs to work out balances, read-only. No emails are returned.
create or replace function public.get_balance_link(p_token uuid)
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'person_id', l.person_id,
    'group', json_build_object('id', g.id, 'name', g.name, 'currency', g.currency, 'simplify_debts', g.simplify_debts),
    'members', coalesce((
      select json_agg(json_build_object('id', p.id, 'name', coalesce(p.full_name, split_part(p.email, '@', 1)),
                                        'pay_methods', p.pay_methods, 'upi_id', p.upi_id))
      from group_members m join profiles p on p.id = m.user_id where m.group_id = g.id), '[]'),
    'pending', coalesce((
      select json_agg(json_build_object('id', pm.id, 'name', pm.name))
      from pending_members pm where pm.group_id = g.id and pm.claimed_by is null), '[]'),
    'expenses', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'title', e.title, 'amount', e.amount, 'date', e.date, 'fx', e.fx,
        'category', e.category, 'created_by', e.created_by,
        'paid_by', e.paid_by, 'paid_by_pending', e.paid_by_pending,
        'participants', (select json_agg(json_build_object('user_id', ep.user_id, 'pending_member_id', ep.pending_member_id, 'share_amount', ep.share_amount))
                         from expense_participants ep where ep.expense_id = e.id)
      ) order by e.date desc, e.created_at desc)
      from expenses e where e.group_id = g.id), '[]'),
    'settlements', coalesce((
      select json_agg(json_build_object('from_person', s.from_person, 'to_person', s.to_person, 'amount', s.amount, 'date', s.date))
      from settlements s where s.group_id = g.id), '[]')
  )
  from balance_links l join groups g on g.id = l.group_id
  where l.token = p_token;
$$;
grant execute on function public.get_balance_link(uuid) to anon, authenticated;

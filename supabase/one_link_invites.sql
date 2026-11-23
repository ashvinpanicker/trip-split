-- ============================================================
-- TripSplit — one shared invite link
-- People open /join/CODE, pick their name from the unclaimed list,
-- and inherit everything already logged against that name.
-- Run after goa_upgrade.sql. Safe to re-run.
-- ============================================================

-- Names not yet claimed in a group (public: only needs the group invite code)
create or replace function public.list_unclaimed_pending(p_code text)
returns table(id uuid, name text)
language sql security definer stable as $$
  select pm.id, pm.name
  from public.pending_members pm
  join public.groups g on g.id = pm.group_id
  where g.invite_code = p_code and pm.claimed_by is null
  order by pm.name;
$$;

-- Claim a name picked from that list
create or replace function public.claim_pending_by_id(p_code text, p_pending_id uuid)
returns json
language plpgsql security definer as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  select pm.invite_token into v_token
  from public.pending_members pm
  join public.groups g on g.id = pm.group_id
  where pm.id = p_pending_id and g.invite_code = p_code and pm.claimed_by is null;

  if v_token is null then
    return json_build_object('error', 'That name was already claimed');
  end if;

  return public.claim_pending_member(v_token);
end;
$$;

grant execute on function public.list_unclaimed_pending(text) to anon, authenticated;
grant execute on function public.claim_pending_by_id(text, uuid) to authenticated;

-- Trip admin tools: how the trip settles up, and editing a person (name or nickname, who they pay for). Safe to run twice.
-- Run before balance_links.sql (its no-sign-in page shows nicknames).

-- Nickname: what the trip calls someone who has joined ("Jose" for "Joseph Jose"). Their own name stays theirs.
alter table public.group_members add column if not exists nickname text check (length(nickname) between 1 and 60);
-- Pays for: a couple or family paying as one counts as 2+ in equal splits. Default 1.
alter table public.group_members   add column if not exists weight smallint not null default 1 check (weight between 1 and 9);
alter table public.pending_members add column if not exists weight smallint not null default 1 check (weight between 1 and 9);

-- One admin action for both kinds of person. Empty name = clear the nickname (joined) / not allowed (not joined).
create or replace function public.update_person(p_group_id uuid, p_person_id uuid, p_name text, p_weight int)
returns void language plpgsql security definer set search_path = public as $$
declare n text := nullif(trim(coalesce(p_name, '')), '');
begin
  if not is_group_admin(p_group_id) then raise exception 'Only trip admins can edit people'; end if;
  if p_weight not between 1 and 9 then raise exception 'Pays for 1 to 9 people'; end if;
  if length(n) > 60 then raise exception 'Name must be 60 characters or fewer'; end if;
  update group_members set nickname = n, weight = p_weight where group_id = p_group_id and user_id = p_person_id;
  if found then return; end if;
  if n is null then raise exception 'Name can''t be empty'; end if;
  update pending_members set name = n, weight = p_weight
   where group_id = p_group_id and id = p_person_id and claimed_by is null;
  if not found then raise exception 'That person isn''t in this trip'; end if;
end;
$$;
grant execute on function public.update_person(uuid, uuid, text, int) to authenticated;


-- How the trip settles up (Group settings):
--   loops  = pay back who paid for you, with circular debts cancelled (default)
--   direct = exactly by person
--   fewest = fewest payments (may pay someone who didn't pay for you)
alter table public.groups add column if not exists settle_mode text not null default 'loops'
  check (settle_mode in ('loops', 'direct', 'fewest'));
-- Trips that had "Simplify" on keep fewest payments; the rest move to the new default
update public.groups set settle_mode = 'fewest' where simplify_debts and settle_mode = 'loops';

-- Trip admin tools. Run after paid_back.sql. Safe to run twice.

-- 1. Rename someone who hasn't joined yet (a typo, or "Jose" → "Joseph").
create or replace function public.rename_pending(p_pending_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select group_id into g from pending_members where id = p_pending_id and claimed_by is null;
  if g is null then raise exception 'That person has already joined or doesn''t exist'; end if;
  if not is_group_admin(g) then raise exception 'Only trip admins can rename people'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'Name must be 1 to 60 characters'; end if;
  update pending_members set name = trim(p_name) where id = p_pending_id;
end;
$$;
grant execute on function public.rename_pending(uuid, text) to authenticated;

-- 2. Weights: a couple or a family can count as 2+ in equal splits.
alter table public.group_members   add column if not exists weight smallint not null default 1 check (weight between 1 and 9);
alter table public.pending_members add column if not exists weight smallint not null default 1 check (weight between 1 and 9);

create or replace function public.set_weight(p_group_id uuid, p_person_id uuid, p_weight int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(p_group_id) then raise exception 'Only trip admins can change this'; end if;
  if p_weight not between 1 and 9 then raise exception 'Counts as 1 to 9 people'; end if;
  update group_members set weight = p_weight where group_id = p_group_id and user_id = p_person_id;
  if not found then
    update pending_members set weight = p_weight where group_id = p_group_id and id = p_person_id;
    if not found then raise exception 'That person isn''t in this trip'; end if;
  end if;
end;
$$;
grant execute on function public.set_weight(uuid, uuid, int) to authenticated;

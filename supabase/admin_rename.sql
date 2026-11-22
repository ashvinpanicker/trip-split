-- Admins can fix the name of someone who hasn't joined yet (a typo, or "Jose" → "Joseph").
-- Run after paid_back.sql. Safe to run twice.
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

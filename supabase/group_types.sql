-- TripSplit — group types and "just track spending" mode
-- kind: sets defaults and copy (friends, family, couple, work, flatmates, other)
-- track_only: hide balances and settle-up; who paid is still recorded, so it can be switched on later

alter table public.groups add column if not exists kind text not null default 'friends';
alter table public.groups drop constraint if exists groups_kind_check;
alter table public.groups add constraint groups_kind_check
  check (kind in ('friends', 'family', 'couple', 'work', 'flatmates', 'other'));

alter table public.groups add column if not exists track_only boolean not null default false;

select kind, track_only, count(*) from public.groups group by 1, 2;

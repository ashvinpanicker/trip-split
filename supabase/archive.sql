-- TripSplit — archive finished trips
-- Archived trips drop off the dashboard and the main Groups list (shown under "Archived").
-- Balances still count, so nobody's money disappears. Admins archive and unarchive.

alter table public.groups add column if not exists archived_at timestamptz;

select count(*) filter (where archived_at is not null) as archived, count(*) as total from public.groups;

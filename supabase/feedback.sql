-- TripSplit — feedback from the website form (/feedback)
-- Anyone can send feedback; nobody can read it through the API. Read it in the Supabase dashboard.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 2 and 4000),
  rating smallint check (rating between 1 and 5),
  contact text check (contact is null or char_length(contact) <= 200),
  source text check (source is null or char_length(source) <= 60),
  user_id uuid references public.profiles(id) on delete set null
);
alter table public.feedback enable row level security;
drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
-- no select/update/delete policies: write-only from the app

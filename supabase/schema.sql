-- Split: spendings table with Row Level Security.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.

create table if not exists public.spendings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 200),
  amount      numeric(10, 2) not null default 0 check (amount >= 0),
  category    text not null default 'Other'
              check (category in ('Food', 'Transport', 'Going out', 'Shopping', 'Study', 'Rent & bills', 'Other')),
  created_at  timestamptz not null default now()
);

create index if not exists spendings_user_id_created_at_idx
  on public.spendings (user_id, created_at desc);

alter table public.spendings enable row level security;

-- Only logged-in users get access, and only to their own rows.
revoke all on public.spendings from anon;
grant select, insert, update, delete on public.spendings to authenticated;

drop policy if exists "Users can read their own spendings" on public.spendings;
create policy "Users can read their own spendings"
  on public.spendings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own spendings" on public.spendings;
create policy "Users can add their own spendings"
  on public.spendings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own spendings" on public.spendings;
create policy "Users can update their own spendings"
  on public.spendings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own spendings" on public.spendings;
create policy "Users can delete their own spendings"
  on public.spendings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

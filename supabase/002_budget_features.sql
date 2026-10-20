-- Split: allowance, fixed costs, savings, money owed between friends, and currency conversion.
-- Run AFTER schema.sql. Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Currency conversion: spendings keep `amount` in euros, plus what was actually paid.
-- ---------------------------------------------------------------------------
alter table public.spendings
  add column if not exists original_amount numeric(12, 2),
  add column if not exists original_currency text check (original_currency ~ '^[A-Z]{3}$'),
  add column if not exists exchange_rate numeric(18, 8);

-- ---------------------------------------------------------------------------
-- Monthly allowance (one row per user).
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  monthly_allowance numeric(10, 2) not null default 0 check (monthly_allowance >= 0),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fixed costs: applied automatically every month; a month's amount can be overridden.
-- ---------------------------------------------------------------------------
create table if not exists public.fixed_costs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  amount     numeric(10, 2) not null default 0 check (amount >= 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fixed_cost_overrides (
  fixed_cost_id uuid not null references public.fixed_costs (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month         date not null check (extract(day from month) = 1),
  amount        numeric(10, 2) not null check (amount >= 0),
  primary key (fixed_cost_id, month)
);

-- ---------------------------------------------------------------------------
-- Savings goals and the deposits (or withdrawals, negative) made into them.
-- ---------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  target_amount numeric(10, 2) not null default 0 check (target_amount >= 0),
  created_at    timestamptz not null default now()
);

create table if not exists public.savings_deposits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id    uuid not null references public.savings_goals (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount <> 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Money owed between the user and their friends.
-- ---------------------------------------------------------------------------
create table if not exists public.debts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person     text not null check (char_length(person) between 1 and 100),
  amount     numeric(10, 2) not null check (amount > 0),
  direction  text not null check (direction in ('i_owe', 'owed_to_me')),
  note       text not null default '' check (char_length(note) <= 200),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fixed_costs_user_id_idx on public.fixed_costs (user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id);
create index if not exists savings_deposits_goal_id_idx on public.savings_deposits (goal_id);
create index if not exists debts_user_id_idx on public.debts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: logged-in users only, and only their own rows.
-- ---------------------------------------------------------------------------
alter table public.budgets              enable row level security;
alter table public.fixed_costs          enable row level security;
alter table public.fixed_cost_overrides enable row level security;
alter table public.savings_goals        enable row level security;
alter table public.savings_deposits     enable row level security;
alter table public.debts                enable row level security;

revoke all on public.budgets, public.fixed_costs, public.fixed_cost_overrides,
              public.savings_goals, public.savings_deposits, public.debts from anon;
grant select, insert, update, delete on public.budgets, public.fixed_costs, public.fixed_cost_overrides,
              public.savings_goals, public.savings_deposits, public.debts to authenticated;

drop policy if exists "Users manage their own budget" on public.budgets;
create policy "Users manage their own budget"
  on public.budgets for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own fixed costs" on public.fixed_costs;
create policy "Users manage their own fixed costs"
  on public.fixed_costs for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Overrides and deposits must also point at a parent row the user owns.
drop policy if exists "Users manage their own fixed cost overrides" on public.fixed_cost_overrides;
create policy "Users manage their own fixed cost overrides"
  on public.fixed_cost_overrides for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.fixed_costs fc
      where fc.id = fixed_cost_id and fc.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own savings goals" on public.savings_goals;
create policy "Users manage their own savings goals"
  on public.savings_goals for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own savings deposits" on public.savings_deposits;
create policy "Users manage their own savings deposits"
  on public.savings_deposits for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.savings_goals g
      where g.id = goal_id and g.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own debts" on public.debts;
create policy "Users manage their own debts"
  on public.debts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

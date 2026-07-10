-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Moves goals out of localStorage and into the database:
--   * profile          — single-row settings (name, goal weight, max/rest HR)
--   * distance_goals   — standing target times for 5k / 10k / 21.0975k / 42.195k
--   * race_goals       — gains distance, goal time, and priority
--
-- Safe to re-run: every statement is guarded.

-- ─── profile (single row, id = 1) ────────────────────────────────────────────
create table if not exists profile (
  id            smallint primary key default 1,
  user_name     text,
  goal_weight   real,          -- kg
  resting_hr    integer,       -- bpm
  max_hr        integer,       -- bpm; null = use highest ever recorded
  updated_at    timestamptz default now(),
  constraint profile_singleton check (id = 1)
);

insert into profile (id) values (1) on conflict (id) do nothing;

-- ─── distance_goals ──────────────────────────────────────────────────────────
-- One standing goal per canonical distance. distance_m is the key so 21097
-- and 21098 can't both exist as "the half".
create table if not exists distance_goals (
  distance_m      integer primary key,   -- 5000, 10000, 21097, 42195
  goal_time_secs  integer not null check (goal_time_secs > 0),
  updated_at      timestamptz default now()
);

-- ─── race_goals: new columns ─────────────────────────────────────────────────
alter table race_goals add column if not exists distance_km    real;
alter table race_goals add column if not exists goal_time_secs integer;
alter table race_goals add column if not exists priority       text default 'A';

-- Only one A race at a time is the usual convention, but we don't enforce it —
-- constraint would fight you mid-edit. Priority is advisory: A/B/C.
alter table race_goals drop constraint if exists race_goals_priority_check;
alter table race_goals add constraint race_goals_priority_check
  check (priority in ('A', 'B', 'C'));

-- ─── RLS: single-user app, same pattern as imported_activities ───────────────
alter table profile        enable row level security;
alter table distance_goals enable row level security;

drop policy if exists "allow all access" on profile;
create policy "allow all access" on profile
  for all using (true) with check (true);

drop policy if exists "allow all access" on distance_goals;
create policy "allow all access" on distance_goals
  for all using (true) with check (true);

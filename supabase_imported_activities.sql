-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Creates the table that stores activities imported from FIT/GPX/TCX files
-- (HealthFit exports, Strava bulk export, etc.).

create table if not exists imported_activities (
  id bigserial primary key,
  start_date timestamptz not null,
  name text,
  sport text,
  distance real,          -- metres
  moving_time integer,    -- seconds
  data jsonb not null,    -- full parsed activity: summary, splits, best efforts, downsampled streams
  created_at timestamptz default now()
);

-- Dedupe guard: the same recording can't be imported twice.
create unique index if not exists imported_activities_dedupe
  on imported_activities (start_date, distance);

-- Supabase enables RLS by default on new tables; without a policy the anon
-- key can't insert. Single-user app: allow everything, like the other tables.
alter table imported_activities enable row level security;
create policy "allow all access"
  on imported_activities
  for all
  using (true)
  with check (true);

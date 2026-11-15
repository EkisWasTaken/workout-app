-- =============================================================================
-- FOOD DIARY
--
--   food_items        your own food library: kcal (and optional macros) per 100 g
--   saved_meals       a named recipe ...
--   saved_meal_items  ... made of food items and their grams
--   meal_entries      what you ate, per day and meal slot
--
-- A diary entry stores its kcal and macros as eaten, so editing a food later
-- never rewrites past days. food_id / saved_meal_id only say where it came from.
--
-- HOW TO RUN: paste this whole file into Supabase > SQL Editor and run it.
-- Safe to re-run. Requires supabase_multiuser.sql to have been run first.
-- =============================================================================

create table if not exists public.food_items (
  id                bigserial primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  kcal_per_100g     real not null check (kcal_per_100g between 0 and 900),
  protein_per_100g  real check (protein_per_100g is null or protein_per_100g between 0 and 100),
  carbs_per_100g    real check (carbs_per_100g is null or carbs_per_100g between 0 and 100),
  fat_per_100g      real check (fat_per_100g is null or fat_per_100g between 0 and 100),
  created_at        timestamptz not null default now()
);
create index if not exists food_items_user on public.food_items (user_id, name);

create table if not exists public.saved_meals (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  created_at  timestamptz not null default now()
);

create table if not exists public.saved_meal_items (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_id     bigint not null references public.saved_meals (id) on delete cascade,
  food_id     bigint not null references public.food_items (id) on delete cascade,
  grams       real not null check (grams > 0 and grams <= 10000)
);
create index if not exists saved_meal_items_meal on public.saved_meal_items (meal_id);

create table if not exists public.meal_entries (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  meal        text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null check (char_length(name) between 1 and 120),
  kcal        integer not null check (kcal between 0 and 10000),
  protein_g   real check (protein_g is null or protein_g between 0 and 1000),
  carbs_g     real check (carbs_g is null or carbs_g between 0 and 1000),
  fat_g       real check (fat_g is null or fat_g between 0 and 1000),
  created_at  timestamptz not null default now()
);
-- Added with the food library; harmless if the table was created above.
alter table public.meal_entries add column if not exists grams real check (grams is null or (grams > 0 and grams <= 10000));
alter table public.meal_entries add column if not exists food_id bigint references public.food_items (id) on delete set null;
alter table public.meal_entries add column if not exists saved_meal_id bigint references public.saved_meals (id) on delete set null;
create index if not exists meal_entries_user_date on public.meal_entries (user_id, date);

do $$
declare t text;
begin
  foreach t in array array['food_items', 'saved_meals', 'saved_meal_items', 'meal_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

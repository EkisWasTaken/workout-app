-- =============================================================================
-- MULTI-USER MIGRATION  — turns this single-user app into per-account isolation.
--
-- What it does:
--   * adds a `user_id` column to every personal table
--   * assigns all your existing data to YOUR account (see step 2 below)
--   * makes the profile / distance-goal / weight / colour / dedupe keys per-user
--     (so two people can log the same day, own a "half" goal, etc.)
--   * replaces the open "allow all access" RLS policies with real per-user ones:
--     from now on the database itself only ever returns a user their own rows.
--
-- HOW TO RUN (once):
--   1. Create the accounts first — sign up in the app, OR
--      Supabase Dashboard > Authentication > Users > Add user.
--      In Authentication > Providers > Email, turn OFF "Confirm email" so the
--      accounts are usable immediately without an email round-trip.
--   2. Copy YOUR user's UUID from Authentication > Users and paste it below,
--      replacing OWNER_UUID_HERE (keep the quotes).
--   3. Run this whole file in the SQL editor. Safe to re-run.
-- =============================================================================

do $$
declare
  owner uuid := 'OWNER_UUID_HERE';   -- ⬅️  REPLACE with your user id, then run
  tbl   text;
  r     record;
  -- Every table that holds one person's data.
  gentables text[] := array[
    'workouts', 'daily_weights', 'imported_activities', 'race_goals',
    'distance_goals', 'workout_templates', 'workout_template_exercises',
    'workout_type_colors', 'profile'
  ];
begin
  -- ── 1. add user_id everywhere and backfill existing rows to the owner ──────
  foreach tbl in array gentables loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade',
      tbl);
    execute format('update public.%I set user_id = %L where user_id is null', tbl, owner);
  end loop;

  -- ── 2. profile was a single row keyed id=1; make it one row per user ───────
  alter table public.profile drop constraint if exists profile_singleton;
  alter table public.profile drop column if exists id cascade;   -- also drops its PK

  -- ── 3. remove single-column PK/UNIQUE *constraints* that would block a
  --       second user from reusing a value (distance_m / date / type) ─────────
  for r in
    select rel.relname as tbl, con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and con.contype in ('p', 'u')
      and rel.relname = any(array['distance_goals', 'daily_weights', 'workout_type_colors'])
      and cardinality(con.conkey) = 1
      and (select att.attname from pg_attribute att
           where att.attrelid = con.conrelid and att.attnum = con.conkey[1])
          in ('distance_m', 'date', 'type')
  loop
    execute format('alter table public.%I drop constraint %I cascade', r.tbl, r.conname);
  end loop;

  -- ── 3b. …and the same as *unique indexes* (not backed by a constraint) ────
  for r in
    select rel.relname as tbl, i.relname as idxname,
           (select att.attname from pg_attribute att
            where att.attrelid = rel.oid and att.attnum = idx.indkey[0]) as col
    from pg_index idx
    join pg_class i   on i.oid = idx.indexrelid
    join pg_class rel on rel.oid = idx.indrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and idx.indisunique and not idx.indisprimary
      and idx.indnkeyatts = 1
      and rel.relname = any(array['distance_goals', 'daily_weights', 'workout_type_colors'])
  loop
    if r.col in ('distance_m', 'date', 'type') then
      execute format('drop index if exists public.%I cascade', r.idxname);
    end if;
  end loop;

  -- Old activity dedupe was global; make it per-user below.
  drop index if exists public.imported_activities_dedupe;

  -- ── 4. lock in user_id, default it to the caller, and enforce RLS ─────────
  foreach tbl in array gentables loop
    execute format('alter table public.%I alter column user_id set not null', tbl);
    execute format('alter table public.%I alter column user_id set default auth.uid()', tbl);
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "allow all access" on public.%I', tbl);
    execute format('drop policy if exists "own rows" on public.%I', tbl);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl);
  end loop;

  -- ── 5. new per-user keys (drop-then-add so re-running is safe) ─────────────
  alter table public.profile        drop constraint if exists profile_pkey;
  alter table public.profile        add  primary key (user_id);
  alter table public.distance_goals drop constraint if exists distance_goals_pkey;
  alter table public.distance_goals add  primary key (user_id, distance_m);

  create unique index if not exists daily_weights_user_date
    on public.daily_weights (user_id, date);
  create unique index if not exists workout_type_colors_user_type
    on public.workout_type_colors (user_id, type);
  create unique index if not exists imported_activities_dedupe
    on public.imported_activities (user_id, start_date, distance);
end $$;

-- `exercises` is a shared reference catalogue (body parts), not personal data,
-- so it keeps its existing open policy and stays readable by everyone.

-- =============================================================================
-- TEMPLATE OWNERSHIP — keep the shared library, stop friends deleting your work.
--
-- supabase_multiuser.sql made workout_templates a fully shared table:
--
--     create policy "shared library" on public.workout_templates
--       for all using (auth.uid() is not null) with check (auth.uid() is not null)
--
-- `for all` covers SELECT, INSERT, UPDATE *and* DELETE, so every signed-in user
-- could edit or delete every other user's templates — and the Templates page
-- showed a Delete button next to all of them with no indication of whose it was.
--
-- This splits that one policy into four:
--
--     read    anyone signed in            (the library stays shared)
--     insert  only as yourself            (can't create rows owned by someone else)
--     update  only your own
--     delete  only your own
--
-- Safe to re-run.
-- =============================================================================

do $$
declare
  tbl text;
  sharedtables text[] := array['workout_templates', 'workout_template_exercises'];
begin
  foreach tbl in array sharedtables loop
    execute format('alter table public.%I enable row level security', tbl);

    -- Drop every previous shape of these policies so re-running is clean.
    execute format('drop policy if exists "allow all access" on public.%I', tbl);
    execute format('drop policy if exists "shared library" on public.%I', tbl);
    execute format('drop policy if exists "own rows" on public.%I', tbl);
    execute format('drop policy if exists "library read" on public.%I', tbl);
    execute format('drop policy if exists "library insert own" on public.%I', tbl);
    execute format('drop policy if exists "library update own" on public.%I', tbl);
    execute format('drop policy if exists "library delete own" on public.%I', tbl);

    -- Everyone signed in can read the whole library.
    execute format(
      'create policy "library read" on public.%I for select using (auth.uid() is not null)', tbl);

    -- You may only add rows stamped with your own id. `user_id` already
    -- defaults to auth.uid(), so ordinary inserts keep working untouched.
    execute format(
      'create policy "library insert own" on public.%I for insert with check (auth.uid() = user_id)', tbl);

    execute format(
      'create policy "library update own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', tbl);

    execute format(
      'create policy "library delete own" on public.%I for delete using (auth.uid() = user_id)', tbl);
  end loop;

  -- Legacy rows created before the multi-user migration may have a null owner,
  -- which would make them undeletable by anyone. Hand them to the first account.
  update public.workout_templates
     set user_id = (select id from auth.users order by created_at limit 1)
   where user_id is null;

  update public.workout_template_exercises
     set user_id = (select id from auth.users order by created_at limit 1)
   where user_id is null;
end $$;

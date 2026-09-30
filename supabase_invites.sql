-- =============================================================================
-- INVITES, ACCOUNT DELETION & LOCKDOWN
--
-- 1. Invite codes. Sign-ups stay open, but only with a valid code. The check
--    runs in the database as the account is created, because the sign-up
--    endpoint is public: a check in the app alone would stop no one.
-- 2. delete_my_account(): lets a user delete their own account and data from
--    Profile. (Their photo files are removed by the app first — storage files
--    can't be deleted from SQL.)
-- 3. Lockdown:
--      * `exercises` becomes read-only, and only for signed-in users. It used
--        to keep an open "allow all" policy, so anyone holding the public anon
--        key could edit or wipe it without even signing in.
--      * template exercises can only be added to or edited in YOUR OWN
--        templates. Before, the insert rule only checked who was adding the
--        row, not whose template it went into.
--
-- HOW TO RUN: paste this whole file into Supabase > SQL Editor and run it.
-- Safe to re-run. Requires supabase_multiuser.sql and
-- supabase_template_ownership.sql to have been run first.
--
-- THEN create a code (see the bottom of this file) and give it to your friends.
-- =============================================================================


-- ─── 1. invite codes ─────────────────────────────────────────────────────────

create table if not exists public.invite_codes (
  code        text primary key,
  uses_left   integer,          -- null = unlimited
  expires_at  timestamptz,      -- null = never
  note        text,             -- who it's for, so you remember
  created_at  timestamptz not null default now()
);

-- Who used which code. No foreign key: the row is written *before* the user
-- row exists, and it's removed when the account is deleted.
create table if not exists public.invite_redemptions (
  id          bigserial primary key,
  code        text not null,
  user_id     uuid not null,
  email       text,
  redeemed_at timestamptz not null default now()
);

-- RLS on and NO policies: invisible and untouchable through the API. Only you
-- (SQL editor / dashboard) and the trigger below can read or change them.
alter table public.invite_codes       enable row level security;
alter table public.invite_redemptions enable row level security;

create or replace function public.enforce_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');
  used     text;
begin
  -- Atomically take one use from a live code. Codes are case-insensitive.
  update public.invite_codes
     set uses_left = uses_left - 1
   where upper(code) = upper(supplied)
     and (expires_at is null or expires_at > now())
     and (uses_left is null or uses_left > 0)
  returning code into used;

  if used is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  insert into public.invite_redemptions (code, user_id, email)
  values (used, new.id, new.email);

  -- The code has done its job; don't keep it in the user's metadata.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$$;

revoke all on function public.enforce_invite_code() from public, anon, authenticated;

drop trigger if exists enforce_invite_code on auth.users;
create trigger enforce_invite_code
  before insert on auth.users
  for each row execute function public.enforce_invite_code();


-- ─── 2. delete my account ────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tbl text;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Their templates go too (the library FK would only null the owner, leaving
  -- orphans nobody can edit). Exercises first, including any in their templates.
  delete from public.workout_template_exercises
   where user_id = uid
      or template_id in (select id from public.workout_templates where user_id = uid);
  delete from public.workout_templates where user_id = uid;

  -- Personal rows. Most cascade from auth.users already; deleting explicitly
  -- also covers any table whose user_id predates the foreign key.
  foreach tbl in array array[
    'workouts', 'daily_weights', 'imported_activities', 'race_goals',
    'distance_goals', 'workout_type_colors', 'profile', 'progress_photos',
    'invite_redemptions'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('delete from public.%I where user_id = $1', tbl) using uid;
    end if;
  end loop;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ─── 3a. exercises: read-only catalogue ──────────────────────────────────────

do $$
declare
  p record;
begin
  if to_regclass('public.exercises') is null then
    return;
  end if;
  -- Drop every existing policy, whatever it was called.
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'exercises' loop
    execute format('drop policy %I on public.exercises', p.policyname);
  end loop;
  alter table public.exercises enable row level security;
  create policy "catalogue read" on public.exercises
    for select to authenticated using (true);
end $$;


-- ─── 3b. template exercises: only inside your own templates ──────────────────

drop policy if exists "library insert own" on public.workout_template_exercises;
create policy "library insert own" on public.workout_template_exercises
  for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.workout_templates t
                where t.id = template_id and t.user_id = auth.uid())
  );

drop policy if exists "library update own" on public.workout_template_exercises;
create policy "library update own" on public.workout_template_exercises
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.workout_templates t
                where t.id = template_id and t.user_id = auth.uid())
  );


-- ─── create invite codes ─────────────────────────────────────────────────────
-- Uncomment, pick your own code, run. Examples:
--
--   insert into public.invite_codes (code, uses_left, note)
--   values ('RUN-WITH-ELIAS-7Q2', 5, 'running friends');
--
--   insert into public.invite_codes (code, uses_left, expires_at, note)
--   values ('GYM-TEAM-2026', 10, now() + interval '30 days', 'gym crew');
--
-- See who signed up with what:
--   select * from public.invite_redemptions order by redeemed_at desc;
--
-- Retire a code:
--   update public.invite_codes set uses_left = 0 where code = 'GYM-TEAM-2026';
--
-- NOTE: every new account needs a code, including ones you add from the
-- dashboard (Authentication > Add user). To add someone by hand, give them a
-- code and let them sign up in the app instead.

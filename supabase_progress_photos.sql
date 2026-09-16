-- =============================================================================
-- PROGRESS PHOTOS
--
-- Body-progress photos, and the storage bucket that holds them.
--
-- These are the most private thing in the app, so:
--   * the bucket is PRIVATE — no public URLs, ever. The app reads photos
--     through short-lived signed URLs.
--   * every file lives under a folder named after its owner's user id, and the
--     storage policies only let a user touch their own folder. Friends with
--     accounts on the same project cannot list, read or delete each other's
--     photos, even by guessing a path.
--   * the table row is per-user under the same "own rows" RLS as everything else.
--
-- The app re-encodes every photo before upload, which strips EXIF — including
-- the GPS position most phones embed in a picture.
--
-- HOW TO RUN: paste this whole file into Supabase > SQL Editor and run it.
-- Safe to re-run. Requires supabase_multiuser.sql to have been run first.
-- =============================================================================

create table if not exists public.progress_photos (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on    date not null,
  pose        text not null default 'front' check (pose in ('front', 'side', 'back')),
  -- Storage object key inside the progress-photos bucket: "<user_id>/<uuid>.jpg"
  path        text not null,
  width       integer,
  height      integer,
  -- Weight on the day, snapshotted at upload so the timelapse labels never shift.
  weight_kg   real,
  note        text,
  -- How to line this photo up with the others, so the timelapse doesn't jump
  -- around: a zoom factor, and an offset as a fraction of the frame size.
  align_scale real not null default 1,
  align_x     real not null default 0,
  align_y     real not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists progress_photos_user_pose_date
  on public.progress_photos (user_id, pose, taken_on);

alter table public.progress_photos enable row level security;
drop policy if exists "own rows" on public.progress_photos;
create policy "own rows" on public.progress_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── storage ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Re-encoded photos are a few hundred KB; 5 MB leaves plenty of room and stops
-- anyone filling the bucket with something that isn't a photo.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg']
where id = 'progress-photos';

drop policy if exists "progress photos: read own"   on storage.objects;
drop policy if exists "progress photos: upload own" on storage.objects;
drop policy if exists "progress photos: update own" on storage.objects;
drop policy if exists "progress photos: delete own" on storage.objects;

create policy "progress photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress photos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

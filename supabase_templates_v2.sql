-- =============================================================================
-- TEMPLATES v2 — makes a workout template a reusable "session blueprint" that
-- can describe a run as well as a gym session, and can be dropped onto any date.
--
-- Adds to workout_templates:
--   kind          'gym' | 'run'  — what sort of session this template builds
--   workout_type  free text: a run flavour ("Easy", "Threshold") or gym split
--                 ("Push", "Legs"); copied onto the workout when scheduled
--   target_pace   e.g. "5:00" — runs only
--   duration      planned minutes
--   distance      planned kilometres — runs only
--   notes         anything extra to copy onto the scheduled workout
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Run supabase_multiuser.sql first if you haven't (this file assumes user_id).
-- =============================================================================

alter table public.workout_templates add column if not exists kind         text default 'gym';
alter table public.workout_templates add column if not exists workout_type text;
alter table public.workout_templates add column if not exists target_pace  text;
alter table public.workout_templates add column if not exists duration     integer;   -- minutes
alter table public.workout_templates add column if not exists distance     real;      -- km
alter table public.workout_templates add column if not exists notes        text;

-- Existing templates predate the split and are all gym sessions.
update public.workout_templates set kind = 'gym' where kind is null;

alter table public.workout_templates
  drop constraint if exists workout_templates_kind_check;
alter table public.workout_templates
  add  constraint workout_templates_kind_check check (kind in ('gym', 'run'));

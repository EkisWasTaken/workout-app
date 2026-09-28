-- Run this in the Supabase SQL editor AFTER supabase_goals_v3.sql.
--
-- The four numbers the energy planner needs and the profile didn't have.
--
-- A goal weight on its own says where you want to end up; it can't say how much
-- to eat to get there. Resting metabolism is a function of height, age and sex
-- as well as weight (Mifflin-St Jeor), and how much your day costs outside
-- training is a fifth thing again — so the planner asks for all of them rather
-- than guessing at an "average person" who doesn't exist.
--
--   birth_year      -- age is derived, so it never goes stale
--   height_cm       -- centimetres
--   sex             -- 'male' | 'female'; used only for the BMR equation
--   activity_level  -- daily life OUTSIDE training, which is counted separately
--
-- Safe to re-run.

alter table profile add column if not exists birth_year smallint;
alter table profile add column if not exists height_cm real;
alter table profile add column if not exists sex text;
alter table profile add column if not exists activity_level text;

-- Stored as a year rather than an age so it doesn't quietly become wrong on a
-- birthday. The lower bound is generous; the upper is "not in the future".
alter table profile drop constraint if exists profile_birth_year_range;
alter table profile add constraint profile_birth_year_range
  check (birth_year is null or (birth_year >= 1900 and birth_year <= extract(year from now())::int));

alter table profile drop constraint if exists profile_height_range;
alter table profile add constraint profile_height_range
  check (height_cm is null or (height_cm >= 120 and height_cm <= 230));

-- Only the two the BMR equation distinguishes. This is a term in an equation,
-- not a statement about anyone — someone whose answer isn't one of these can
-- leave it empty and set the resulting targets by hand.
alter table profile drop constraint if exists profile_sex_values;
alter table profile add constraint profile_sex_values
  check (sex is null or sex in ('male', 'female'));

alter table profile drop constraint if exists profile_activity_values;
alter table profile add constraint profile_activity_values
  check (activity_level is null or activity_level in ('sedentary', 'light', 'moderate', 'very'));

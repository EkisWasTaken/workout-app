-- Run this in the Supabase SQL editor AFTER supabase_goals.sql.
--
-- Three additions, all driven by one idea: a goal without a date can't be
-- "next", and training paces must come from fitness you actually have.
--
--   distance_goals.target_date   — null means "someday": tracked, never drives paces
--   race_goals.result_time_secs  — what you actually ran; the truest VDOT input
--   profile.vdot_override        — manual current VDOT when you know better
--
-- Safe to re-run.

alter table distance_goals add column if not exists target_date date;
alter table race_goals     add column if not exists result_time_secs integer;
alter table profile        add column if not exists vdot_override real;

-- A result only makes sense with a distance to go with it.
alter table race_goals drop constraint if exists race_goals_result_needs_distance;
alter table race_goals add constraint race_goals_result_needs_distance
  check (result_time_secs is null or distance_km is not null);

alter table race_goals drop constraint if exists race_goals_result_positive;
alter table race_goals add constraint race_goals_result_positive
  check (result_time_secs is null or result_time_secs > 0);

alter table profile drop constraint if exists profile_vdot_range;
alter table profile add constraint profile_vdot_range
  check (vdot_override is null or (vdot_override >= 20 and vdot_override <= 90));

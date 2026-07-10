-- Run this in the Supabase SQL editor AFTER supabase_goals_v2.sql.
--
-- Terrain. VDOT models distance and duration, but assumes flat road. A hilly
-- cross-country race like Lidingöloppet runs meaningfully slower than the same
-- distance on tarmac, and nothing in the model knew that.
--
-- terrain_factor is the expected time multiplier versus flat road:
--   1.00  flat road (default)
--   1.05  rolling
--   1.10  hilly trail (Lidingöloppet is usually reckoned around here)
--   1.20  mountain / very technical
--
-- A goal time on a hilly course therefore demands a HIGHER VDOT than the same
-- time on the road, and a predicted finish on that course is slower.
--
-- Safe to re-run.

alter table race_goals add column if not exists terrain_factor real default 1.0;

alter table race_goals drop constraint if exists race_goals_terrain_range;
alter table race_goals add constraint race_goals_terrain_range
  check (terrain_factor is null or (terrain_factor >= 0.8 and terrain_factor <= 1.5));

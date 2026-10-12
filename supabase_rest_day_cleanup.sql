-- Rest days are now just empty days. This removes the old "Rest" entries.
--
-- Matches exactly what the app treats as rest (getWorkoutType in
-- src/utils/workouts.ts): a type of "Rest"/"Rest day" in any casing, or no
-- recognised type and a name that mentions rest but not gym, run or bike.
--
-- It's a soft delete (isDeleted = 1), like the app's own delete, so it can be
-- undone by setting isDeleted back to 0 for the same rows.
-- Run the SELECT first to see what will go, then the UPDATE.

-- 1. Preview
select id, user_id, date, name, type, "isCompleted"
from workouts
where "isDeleted" = 0
  and (
    lower(coalesce(type, '')) in ('rest', 'rest day')
    or (
      lower(coalesce(type, '')) not in
        ('gym', 'strength', 'running', 'run', 'bike', 'cycling', 'cycle', 'other')
      and lower(name) like '%rest%'
      and lower(name) !~ '(gym|strength|weights|run|jog|bike|cycle)'
    )
  )
order by date;

-- 2. Remove
update workouts
set "isDeleted" = 1
where "isDeleted" = 0
  and (
    lower(coalesce(type, '')) in ('rest', 'rest day')
    or (
      lower(coalesce(type, '')) not in
        ('gym', 'strength', 'running', 'run', 'bike', 'cycling', 'cycle', 'other')
      and lower(name) like '%rest%'
      and lower(name) !~ '(gym|strength|weights|run|jog|bike|cycle)'
    )
  );

-- Enforce "only one Run in progress system-wide" at the DB level too,
-- since the application-level check-then-insert in startRun() has a race
-- window between the check and the insert.
alter table runs add column is_active boolean generated always as (
  status in ('scraping', 'synthesizing', 'awaiting_approval', 'generating')
) stored;

create unique index runs_single_active_idx on runs ((is_active)) where is_active;

-- Distinct from 'complete': a Run abandoned by the user while stuck in a
-- background phase never produced an email draft, so it shouldn't be
-- reported as complete. Neither status counts as "in progress" (see
-- 0002_one_active_run.sql's is_active), so cancelling always unblocks new runs.
alter type run_status add value 'cancelled';

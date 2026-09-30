-- Surfaces why a Run permanently failed (job exhausted pg-boss retries),
-- instead of the Run silently sitting at its last in-progress status forever.
alter table runs add column error_message text;

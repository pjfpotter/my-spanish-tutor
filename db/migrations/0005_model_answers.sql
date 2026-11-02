-- Ready-made model answers for a course (answer-writing-coach: Draft failure handling). Hand-authored, so
-- a student is never blocked when drafting is unavailable or capped. Shape: [{questionPosition, rung, text}].
alter table courses add column model_answers jsonb not null default '[]';

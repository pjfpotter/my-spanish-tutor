-- A course can have more than one sentence builder, four or five core questions, and extra (extension) questions
-- that are practised but never gate the path (course-content: Course shape, design D21).
-- `builder` names which sentence builder a chunk came from; null means the course's only builder.
alter table chunks add column builder text;
-- Extension questions are practised like any other but are not counted toward unlocking or readiness.
alter table questions add column extension boolean not null default false;

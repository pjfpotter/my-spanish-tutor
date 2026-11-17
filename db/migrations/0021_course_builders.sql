-- A course holds one or more sentence builders (course-builder-per-question). Each builder is the re-typeset
-- sheet and the checked interpretation of one uploaded document, with its own calibration, and holds no
-- student data. A question names at most one builder and is linked to one of that builder's own questions
-- (a section of the sheet). courses.sheet and courses.interpretation stay in place and unread for one
-- release; the backfill in scripts/migrate.mjs copies them into one builder per existing course.
create table course_builders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  position integer not null,
  key text not null,
  name text not null,
  sheet jsonb not null,
  interpretation jsonb not null,
  calibration jsonb not null,
  created_at timestamptz not null default now(),
  unique (course_id, position),
  unique (course_id, key)
);
alter table questions add column builder_id uuid references course_builders (id) on delete set null;
alter table questions add column builder_question integer;

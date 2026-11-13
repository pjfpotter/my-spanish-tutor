-- Where each of a student's answers is on the memorise ladder (task 27.4): which lesson is next, the most help-free
-- level reached, the day the last unaided run was done, and the days of the clean from-memory answers.
-- Days are whole days since 1 January 2026 in UK time (lib/memorise/day.ts), so "tomorrow" opens at UK midnight.
-- Only numbers are kept. Whether an answer is memorised is decided by the mastery table as before; this table only
-- remembers the path through the lessons. The audio of what a student said is never stored.
create table memorise_ladder (
  profile_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  stage smallint not null default 0,
  top smallint not null default 0,
  wipe_day integer not null default 0,
  recalls integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (profile_id, question_id)
);

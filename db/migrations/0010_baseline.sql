-- The starting-point check at course start: test, teach, test. One row per question and stage. Not practice:
-- it never counts toward mastery, coins or streaks, it only tells the app where to begin.
create table baseline_results (
  profile_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  stage text not null check (stage in ('pre', 'post')),
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, question_id, stage)
);

-- Replay, slow and reveal are each recorded on the attempt (question-comprehension: Replay and reveal).
alter table attempts
  add column replays smallint not null default 0,
  add column used_slow boolean not null default false,
  add column revealed boolean not null default false;

-- A clip that would not load is recorded so it can be fixed (speech-audio-assets: Fallback when audio is missing).
-- The profile link is cleared, not the row, when a profile is deleted.
create table clip_failures (
  id bigint generated always as identity primary key,
  slot text not null,
  profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

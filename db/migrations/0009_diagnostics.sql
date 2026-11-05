-- Which sentence-builder chunks of a student's own answer were missed when they said it from memory.
-- Kept apart from attempts so chunk rows never count as practice rounds, streak days or mastery.
create table chunk_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  chunk_id uuid not null references chunks (id) on delete cascade,
  session_id uuid not null,
  missed boolean not null,
  created_at timestamptz not null default now()
);
create index chunk_events_idx on chunk_events (profile_id, chunk_id, created_at);

-- One-tap mood at the start of a session. A fixed list of answers, never free text.
create table mood_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  session_id uuid not null,
  mood text not null check (mood in ('good', 'ok', 'nervous', 'tired', 'not_a_fan')),
  created_at timestamptz not null default now()
);
create index mood_checkins_idx on mood_checkins (profile_id, created_at);

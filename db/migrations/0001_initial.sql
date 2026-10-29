-- Initial schema. No table holds a real name, email address or recording.
-- Migrations are additive so a Vercel rollback never loses data.

create table courses (
  id uuid primary key default gen_random_uuid(),
  class_code text not null unique,
  owner_token_hash text not null,
  title text not null,
  test_date date,
  mark_scheme jsonb not null default '{}',
  cheeky_pool boolean not null default false,
  created_at timestamptz not null default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  spanish text not null,
  english_gloss text not null,
  category text not null,
  feature_tags text[] not null default '{}',
  recycled boolean not null default false
);
create index chunks_course_idx on chunks (course_id);

create table questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  position integer not null,
  spanish text not null,
  english_subtitle text not null,
  recycled boolean not null default false,
  unique (course_id, position)
);

-- Anonymous: a random id, a generated nickname and fixed interest tags only.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  nickname text not null,
  interest_tags text[] not null default '{}',
  recovery_code_hash text not null unique,
  created_at timestamptz not null default now()
);
create index profiles_course_idx on profiles (course_id);

create table answers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  text text not null,
  level smallint not null,
  confirmed_at timestamptz,
  unique (profile_id, question_id)
);

-- item_kind and item_id point at a chunk or a question.
create table attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  item_kind text not null check (item_kind in ('chunk', 'question')),
  item_id uuid not null,
  phase text not null,
  outcome text not null,
  accuracy numeric(5, 2),
  response_time_ms integer,
  voice text,
  speed numeric(3, 2),
  assisted boolean not null default false,
  cause_tags text[] not null default '{}',
  session_id uuid not null,
  created_at timestamptz not null default now()
);
create index attempts_profile_idx on attempts (profile_id, created_at);

create table mastery (
  profile_id uuid not null references profiles (id) on delete cascade,
  item_kind text not null check (item_kind in ('chunk', 'question')),
  item_id uuid not null,
  phase text not null,
  qualifying_successes integer not null default 0,
  distinct_sessions integer not null default 0,
  last_success_session_id uuid,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_kind, item_id, phase)
);

create table plans (
  profile_id uuid primary key references profiles (id) on delete cascade,
  minutes_per_day integer not null,
  scheduled_sessions jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table coin_ledger (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index coin_ledger_profile_idx on coin_ledger (profile_id);

-- Append-only: entries are never edited. Rows still go when a profile is deleted.
create function coin_ledger_no_update() returns trigger language plpgsql as $$
begin
  raise exception 'coin_ledger is append-only';
end;
$$;
create trigger coin_ledger_no_update
  before update on coin_ledger
  for each row execute function coin_ledger_no_update();

create table inventory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  item text not null,
  acquired_at timestamptz not null default now()
);
create index inventory_profile_idx on inventory (profile_id);

create table phrase_banks (
  id uuid primary key default gen_random_uuid(),
  persona_id text not null,
  situation_key text not null,
  spanish text not null,
  english_subtitle text not null,
  clip_id text
);
create index phrase_banks_lookup_idx on phrase_banks (persona_id, situation_key);

-- Spend record, not personal data. The profile link is cleared (not the row)
-- when a profile is deleted so budget totals stay correct.
create table cost_log (
  id bigint generated always as identity primary key,
  service text not null,
  tier text not null,
  units numeric not null,
  estimated_cost_gbp numeric(12, 6) not null,
  course_id uuid references courses (id) on delete set null,
  profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index cost_log_created_idx on cost_log (created_at);
create index cost_log_profile_idx on cost_log (profile_id, created_at);

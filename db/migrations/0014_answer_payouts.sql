-- An answer's value is paid through learning (engagement-rewards: Answer value is paid through learning).
-- This records how much of each answer's value has been paid so far, so a stage is never paid twice and the
-- payout is a simple top-up. The money itself is in coin_ledger (reason 'answer'); this table only remembers the total.
create table answer_payouts (
  profile_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  paid integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, question_id)
);

-- The writing screen builds an answer from the question's own sentence builder (answer-writing-coach:
-- Build from empty spaces, Question's own sentence builder). `topics` are the chunk categories the
-- question may use; `template` is the subset shown as empty slots when the student opens the question.
alter table questions add column topics text[] not null default '{}';
alter table questions add column template text[] not null default '{}';

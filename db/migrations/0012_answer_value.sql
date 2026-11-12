-- Answers are valued, not levelled (answer-writing-coach: Value grows with detail). The old column held a
-- level from 1 to 3; the rubric now stores the answer's value, a whole number that grows with detail.
-- Old rows keep a small number until the student next edits the answer, which re-saves the real value.
alter table answers rename column level to value;
alter table answers alter column value type integer;

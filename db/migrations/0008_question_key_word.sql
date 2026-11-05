-- The one word (or short phrase) the comprehension probe plays on its own after a missed question.
alter table questions add column key_word text;
alter table questions add column key_word_english text;

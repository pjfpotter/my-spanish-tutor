-- A course can carry the teacher's sentence builder: the re-typeset sheet and its reviewed interpretation
-- (upload-sentence-builder-pipeline). Both are teacher content with no student data. A course with no
-- sheet keeps the original chunk-swap writing flow. `selection` records which sheet chunks a student
-- chose, so the writing screen can be restored; the sentence itself is still stored in `text`.
alter table courses add column sheet jsonb;
alter table courses add column interpretation jsonb;
alter table answers add column selection jsonb;

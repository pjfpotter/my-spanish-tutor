-- A chunk is identified by its Spanish text within a course, so re-running the seed updates rather than duplicates.
create unique index chunks_course_spanish_idx on chunks (course_id, spanish);

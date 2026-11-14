-- Where a course is on the way to a class (task 23.3). Status is worked out from the course's content; these columns
-- hold the sign-offs. A sign-off stores the hash of the content it was given for, so an edit lapses it by itself.
alter table courses add column reviewed_hash text;
alter table courses add column published_hash text;
alter table courses add column published_at timestamptz;
alter table courses add column shared_at timestamptz;
-- Courses that already exist were already in use: they count as published and shared (they have no hash to lapse).
update courses set published_at = now(), shared_at = now();

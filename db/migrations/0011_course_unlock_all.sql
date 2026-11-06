-- A testing course opens every phase from the first visit (course-unlock-testing). Off by default, so every
-- existing course, and any course created without thinking about it, keeps the gated order. Only the seed sets it.
alter table courses add column unlock_all boolean not null default false;

-- Who loaded a course, as an opaque label the developer gives (a school or teacher code), so a monthly limit on new
-- courses can be kept (task 23.7). There are no teacher accounts and no personal details: it is only a label. Null means
-- the developer's own courses, which are not limited.
alter table courses add column teacher_ref text;

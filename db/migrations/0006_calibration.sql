-- The mark scheme becomes editable calibration data (course-content: Calibration data is editable):
-- features, thresholds, level names, glue words and the teacher's examples, versioned per course.
alter table courses rename column mark_scheme to calibration;

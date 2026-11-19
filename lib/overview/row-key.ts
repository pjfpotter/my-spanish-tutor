/**
 * The React key of a student's row in the teacher overview. A nickname alone is not enough: classes made before nicknames were
 * kept unique already hold students with the same one, and two rows with the same key can be dropped or mixed up when React
 * updates the table. The position makes every key different.
 */
export const studentRowKey = (index: number, nickname: string): string => `${index}-${nickname}`;

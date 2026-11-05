/** Rough count of syllables in an English word (vowel groups, silent final e). Good enough for a reading-level check. */
export function syllablesEn(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Flesch-Kincaid grade level. About 7 is easy for a 12 to 13 year old; school years run about age minus five. */
export function fleschKincaidGrade(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length);
  const words = text.match(/[A-Za-z']+/g) ?? [];
  if (!words.length) return 0;
  const syllables = words.reduce((n, w) => n + syllablesEn(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

/**
 * The small list of common words a draft may use on top of the sentence builder (answer-writing-coach:
 * Answers built from the sentence builder). Function words only: articles, prepositions, joining
 * words, pronouns, possessives and a few everyday words a student can safely say. Anything that
 * carries topic meaning (a verb, a noun, an adjective) must come from the course's chunks.
 *
 * Kept short on purpose. A word added here is a word every course allows, so adding one is a
 * decision about the whole app, not about one answer. Written without accents or capitals: the
 * validator compares words that way.
 */
export const ALLOWED_COMMON_WORDS: readonly string[] = [
  // Articles
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  // Prepositions
  'a', 'al', 'de', 'del', 'en', 'con', 'por', 'para', 'sin',
  // Joining and question words
  'y', 'e', 'o', 'u', 'pero', 'que', 'porque', 'si', 'como', 'cuando',
  // Pronouns and possessives
  'yo', 'tu', 'te', 'me', 'se', 'mi', 'mis', 'tus', 'su', 'sus', 'nos',
  // Everyday words
  'no', 'muy', 'mas', 'tambien', 'hay', 'es', 'son', 'soy', 'estoy',
];

/** One chunk as printed on a sentence builder: Spanish, and the English the sheet gives for it, if any. */
export interface Chunk {
  es: string;
  en: string | null;
  /** Marked with an asterisk on the sheet: a harder item. */
  hard: boolean;
  /** For a "(no) ..." variant with no gloss of its own: the gloss of the positive form. */
  negOf?: string | null;
}

/** A cell of a table, which is usually one list on the sheet. Positions are zero-based grid positions. */
export interface SheetCell {
  id: string;
  r: number;
  c: number;
  /** Rows and columns the cell spans. */
  rs: number;
  cs: number;
  items: Chunk[];
  /** Background shading, if any. Kept as a hint only. */
  fill: string | null;
}

export interface SheetTable {
  index: number;
  /** Column widths from the document, in its own units. */
  grid: number[];
  rows: number;
  cells: SheetCell[];
}

export interface Sheet {
  titles: { es: string; en: string | null; after: number }[];
  tables: SheetTable[];
  /** Chunks in floating text boxes, with the cell they were anchored in. */
  floats: { host: string; items: { es: string; en: string | null }[] }[];
  warnings: string[];
  stats: { items: number; glossed: number; hard: number };
  /** How this document marks its text, which decides how English is told from Spanish. */
  flags: { hasBold: boolean; hasItalic: boolean };
  images: number;
}
